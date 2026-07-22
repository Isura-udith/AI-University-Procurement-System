const mongoose = require('mongoose');
const Vendor = require('../apps/api/src/models/vendor.model');
const User = require('../apps/api/src/models/user.model');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const vendor = await Vendor.findOne({ companyName: 'MedTech Solutions (Pvt) Ltd' });
  console.log('MedTech:', vendor);

  const user = await User.findOne({ email: 'supplier@vendor.lk' });
  console.log('Supplier User:', user);

  await mongoose.disconnect();
}

run().catch(console.error);
