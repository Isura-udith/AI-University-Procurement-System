require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Procurement = require('./src/models/procurement.model');

async function run() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uwu_procurement';
    await mongoose.connect(uri);

    console.log('\n--- DETAILED USER & PROCUREMENT CHECK ---');
    const user = await User.findOne({ email: 'pathumi@gmail.com' });
    if (user) {
      console.log('User model fields:');
      console.log('  _id:', user._id);
      console.log('  email:', user.email);
      console.log('  role:', user.role);
      console.log('  department:', user.department);
      console.log('  faculty:', user.faculty);
    } else {
      console.log('User pathumi@gmail.com not found');
    }

    const procurement = await Procurement.findOne({ referenceNumber: 'UWU/G/Shopping/2026/002' });
    if (procurement) {
      console.log('Procurement model fields:');
      console.log('  _id:', procurement._id);
      console.log('  referenceNumber:', procurement.referenceNumber);
      console.log('  requestedBy:', procurement.requestedBy);
      console.log('  department:', procurement.department);
      console.log('  faculty:', procurement.faculty);
    } else {
      console.log('Procurement UWU/G/Shopping/2026/002 not found');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
