const mongoose = require('mongoose');
const Tender = require('../apps/api/src/models/tender.model');
const Bid = require('../apps/api/src/models/bid.model');
const tenderService = require('../apps/api/src/services/tender.service');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const tender = await Tender.findOne({ tenderNumber: 'TND-2026-0004' });
  if (!tender) {
    console.error('Tender TND-2026-0004 not found');
    await mongoose.disconnect();
    return;
  }
  console.log('Tender:', tender._id, tender.tenderNumber, 'Status:', tender.status, 'Deadline:', tender.bidSubmissionDeadline);

  try {
    const result = await tenderService.openBidBox(tender._id, new mongoose.Types.ObjectId(), 'uwu-main');
    console.log('Success! Result status:', result.status);
  } catch (err) {
    console.error('Error occurred:', err.message, err.statusCode);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
