const mongoose = require('mongoose');
const Tender = require('../apps/api/src/models/tender.model');
const Bid = require('../apps/api/src/models/bid.model');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const tenders = await Tender.find();
  console.log('Tenders count:', tenders.length);
  for (const t of tenders) {
    console.log(`- Tender: ${t.tenderNumber}, Status: ${t.status}, Deadline: ${t.bidSubmissionDeadline}`);
    const bids = await Bid.find({ tenderId: t._id });
    console.log(`  Bids (${bids.length}):`, bids.map(b => ({ id: b._id, status: b.status, isSealed: b.isSealed, amount: b.totalBidAmount })));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
