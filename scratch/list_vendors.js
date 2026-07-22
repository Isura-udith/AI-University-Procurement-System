const mongoose = require('mongoose');
const Vendor = require('../apps/api/src/models/vendor.model');
const User = require('../apps/api/src/models/user.model');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const vendors = await Vendor.find().populate('userId');
  console.log('Vendors count:', vendors.length);
  for (const v of vendors) {
    console.log(`- Vendor: ${v.companyName}, Email: ${v.email}, User: ${v.userId?.email}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
