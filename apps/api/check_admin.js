const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-procurement';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = mongoose.connection.collection('users');
    const adminUser = await User.findOne({ email: 'admin@uwu.ac.lk' });
    console.log('--- ADMIN USER IN DB ---');
    if (!adminUser) {
      console.log('USER admin@uwu.ac.lk NOT FOUND IN DATABASE!');
      const allUsers = await User.find({}, { projection: { email: 1, role: 1 } }).toArray();
      console.log('All users in DB:', allUsers);
    } else {
      console.log('Found user:', {
        _id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        loginAttempts: adminUser.loginAttempts,
        lockUntil: adminUser.lockUntil,
        hasPassword: !!adminUser.password,
      });
      if (adminUser.password) {
        const isMatch = await bcrypt.compare('Demo@1234', adminUser.password);
        console.log('Does password "Demo@1234" match?', isMatch);
      }
    }
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
