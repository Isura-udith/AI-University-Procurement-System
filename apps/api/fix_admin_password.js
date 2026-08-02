const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/user.model');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-procurement';

async function fix() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');
    
    // Fix admin@uwu.ac.lk
    const admin = await User.findOne({ email: 'admin@uwu.ac.lk' }).select('+password');
    if (admin) {
      console.log('Found admin user, resetting password and unlocking...');
      admin.password = 'Demo@1234';
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      admin.isActive = true;
      await admin.save();
      console.log('✓ admin@uwu.ac.lk password reset to Demo@1234 and unlocked!');
    } else {
      console.log('admin@uwu.ac.lk not found!');
    }

    // Fix staff@uwu.ac.lk
    const staff = await User.findOne({ email: 'staff@uwu.ac.lk' }).select('+password');
    if (staff) {
      staff.password = 'Demo@1234';
      staff.loginAttempts = 0;
      staff.lockUntil = undefined;
      staff.isActive = true;
      await staff.save();
      console.log('✓ staff@uwu.ac.lk password reset to Demo@1234 and unlocked!');
    }

  } catch (err) {
    console.error('Error fixing admin password:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fix();
