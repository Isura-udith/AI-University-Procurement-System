const mongoose = require('mongoose');
const Tender = require('../apps/api/src/models/tender.model');
const Bid = require('../apps/api/src/models/bid.model');
const Vendor = require('../apps/api/src/models/vendor.model');
const User = require('../apps/api/src/models/user.model');
const Procurement = require('../apps/api/src/models/procurement.model');
const tenderService = require('../apps/api/src/services/tender.service');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const tenantId = 'uwu-main';

  // 1. Get mock user & vendor
  const user = await User.findOne({ email: 'supplier@vendor.lk' });
  const officer = await User.findOne({ email: 'procurement@uwu.ac.lk' });
  if (!user || !officer) {
    throw new Error('User supplier@vendor.lk or officer not found in DB');
  }

  // Find vendor by email (perera@medtech.lk corresponds to MedTech which has supplier@vendor.lk as userEmail)
  let vendor = await Vendor.findOne({ email: 'perera@medtech.lk' });
  if (!vendor) {
    vendor = await Vendor.findOne({ email: 'supplier@vendor.lk' });
  }
  if (!vendor) {
    throw new Error('Vendor not found for supplier');
  }
  
  // Link the vendor to the supplier user dynamically to fix any ID mismatch
  vendor.userId = user._id;
  await vendor.save();
  console.log(`Using vendor: ${vendor.companyName} (${vendor._id}) linked to user: ${user.email}`);

  // Get a valid procurement ID
  const procurement = await Procurement.findOne();
  if (!procurement) {
    throw new Error('No procurement document found in DB');
  }
  console.log(`Linking to procurement: ${procurement.referenceNumber} (${procurement._id})`);

  // 2. Prepare test tender
  console.log('\n--- Test Stage 0: Create/Reset Tender ---');
  let tender = await Tender.findOne({ tenderNumber: 'TND-TEST-LIFECYCLE' });
  if (tender) {
    await Bid.deleteMany({ tenderId: tender._id });
    await Tender.deleteOne({ _id: tender._id });
  }

  tender = await Tender.create({
    tenantId,
    tenderNumber: 'TND-TEST-LIFECYCLE',
    title: 'Test Bid Lifecycle Tender',
    description: 'Tender description',
    category: 'Goods',
    status: 'published', // Active for bidding
    procurementId: procurement._id,
    bidSubmissionDeadline: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in future
    bidOpeningDate: new Date(Date.now() + 1000 * 60 * 120),
    estimatedValue: 1000000,
    technicalCriteria: [
      { criterion: 'Relevant Experience', maxScore: 50 },
      { criterion: 'Technical Methodology', maxScore: 50 },
    ],
    technicalPassMark: 70,
    createdBy: officer._id,
  });
  console.log(`Created test tender: ${tender.tenderNumber}, Status: ${tender.status}`);

  // 3. Bid submission
  console.log('\n--- Test Stage 1: Bid Submission ---');
  const bidData = {
    lineItems: [
      { itemDescription: 'Item 1', quantity: 10, unit: 'pcs', unitPrice: 80000 },
    ],
    vatAmount: 80000,
    discountOffered: 30000,
    technicalProposal: { methodology: 'Method A', timeline: '30 Days', experience: '5 Years' },
    documents: [{ name: 'spec_sheet.pdf', url: 'uploads/spec_sheet.pdf', type: 'pdf' }],
  };

  const bid = await tenderService.submitBid(tender._id, bidData, user._id, tenantId);
  console.log(`Bid submitted! Bid Number: ${bid.bidNumber}`);
  console.log(`isSealed status: ${bid.isSealed} (Expected: true)`);
  console.log(`Auto-generated encryptionHash: ${bid.encryptionHash}`);
  if (!bid.encryptionHash) {
    throw new Error('Encryption hash was not generated!');
  }
  console.log(`Total Bid Amount auto-calculated: LKR ${bid.totalBidAmount} (Expected: 80000*10 + 80000 - 30000 = 850000)`);
  if (bid.totalBidAmount !== 850000) {
    throw new Error(`Total Bid Amount calculated incorrectly! Got: ${bid.totalBidAmount}`);
  }

  // 4. Duplicate submission prevention
  console.log('\n--- Test Stage 2: Duplicate Prevention ---');
  try {
    await tenderService.submitBid(tender._id, bidData, user._id, tenantId);
    throw new Error('Duplicate submission was allowed (should have failed)!');
  } catch (err) {
    console.log(`Duplicate prevention worked. Received expected error: "${err.message}" (Status Code: ${err.statusCode})`);
    if (err.statusCode !== 409) {
      throw new Error(`Expected status code 409, got: ${err.statusCode}`);
    }
  }

  // 5. Close bidding
  console.log('\n--- Test Stage 3: Bid Closing ---');
  let updatedTender = await tenderService.closeBidding(tender._id, officer._id, tenantId);
  console.log(`Tender status changed to: ${updatedTender.status} (Expected: bid_closed)`);
  console.log(`Bid box locked status: ${updatedTender.bidBoxLocked} (Expected: true)`);
  if (updatedTender.status !== 'bid_closed' || !updatedTender.bidBoxLocked) {
    throw new Error('Bidding did not close correctly');
  }

  // 6. Open bid box (Start Ceremony)
  console.log('\n--- Test Stage 4: Start Ceremony / Open Bid Box ---');
  // Note: Tender is manually closed, but deadline is in the future.
  // Our relaxed check should allow this.
  updatedTender = await tenderService.openBidBox(tender._id, officer._id, tenantId);
  console.log(`Tender status changed to: ${updatedTender.status} (Expected: opening)`);
  console.log(`Bid box locked status: ${updatedTender.bidBoxLocked} (Expected: false)`);
  
  // Verify bids are still sealed
  let bidCheck = await Bid.findById(bid._id);
  console.log(`Bid isSealed: ${bidCheck.isSealed} (Expected: true)`);
  console.log(`Bid status: ${bidCheck.status} (Expected: submitted)`);
  if (!bidCheck.isSealed || bidCheck.status !== 'submitted') {
    throw new Error('Bids were automatically unsealed at start of ceremony (should remain sealed)');
  }

  // 7. Unseal Bid
  console.log('\n--- Test Stage 5: Unseal Bid ---');
  const unsealedBid = await tenderService.unsealBid(tender._id, bid._id, officer._id, tenantId);
  console.log(`Bid isSealed: ${unsealedBid.isSealed} (Expected: false)`);
  console.log(`Bid status: ${unsealedBid.status} (Expected: opened)`);
  if (unsealedBid.isSealed || unsealedBid.status !== 'opened') {
    throw new Error('Bid did not unseal correctly');
  }

  // 8. Complete Ceremony
  console.log('\n--- Test Stage 6: Complete Ceremony ---');
  const completeRes = await tenderService.completeBidOpening(tender._id, officer._id, tenantId);
  console.log(`Tender status changed to: ${completeRes.tender.status} (Expected: evaluation)`);
  if (completeRes.tender.status !== 'evaluation') {
    throw new Error('Tender status not updated to evaluation');
  }

  // 9. Evaluate Bid (QCBS Combined Score calculation)
  console.log('\n--- Test Stage 7: Evaluate Bid ---');
  const evaluationScores = {
    technicalScores: [
      { criterion: 'Relevant Experience', maxScore: 50, givenScore: 40 },
      { criterion: 'Technical Methodology', maxScore: 50, givenScore: 45 },
    ],
    techWeight: 70,
    financialEvaluation: {
      correctedAmount: 850000,
    },
  };

  const evaluatedBid = await tenderService.evaluateBid(tender._id, bid._id, evaluationScores, officer._id, tenantId);
  console.log(`Bid status: ${evaluatedBid.status} (Expected: financially_evaluated)`);
  console.log(`Combined Score calculated: ${evaluatedBid.combinedScore}`);
  console.log(`Rank: ${evaluatedBid.rank} (Expected: 1)`);
  
  // Calculate expected:
  // tech raw: 40 + 45 = 85. max = 100. weight = 70. score = (85/100)*70 = 59.5.
  // fin raw: lowest price = 850000. bid price = 850000. weight = 30. score = (850000/850000)*30 = 30.
  // combined: 59.5 + 30 = 89.5.
  if (evaluatedBid.combinedScore !== 89.5) {
    throw new Error(`Combined score calculated incorrectly! Got: ${evaluatedBid.combinedScore}, Expected: 89.5`);
  }
  console.log('Combined score is correct!');

  // Cleanup
  console.log('\n--- Cleaning up test data ---');
  await Bid.deleteMany({ tenderId: tender._id });
  await Tender.deleteOne({ _id: tender._id });
  console.log('Cleanup completed.');

  console.log('\nALL TESTS PASSED SUCCESSFULLY! ✅');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('\nTEST FAILED ❌:', err);
  await mongoose.disconnect();
  process.exit(1);
});
