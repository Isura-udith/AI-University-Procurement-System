const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/user.model');

async function syncPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');
    const users = await User.find({});
    let updatedCount = 0;
    for (const u of users) {
      if (u.email && u.email.endsWith('@uwu.ac.lk') || u.email.endsWith('@vendor.lk')) {
        u.password = 'Demo@1234';
        u.loginAttempts = 0;
        u.lockUntil = undefined;
        u.isActive = true;
        await u.save();
        updatedCount++;
      }
    }
    console.log(`Successfully synced passwords to 'Demo@1234' for ${updatedCount} demo users!`);
  } catch (err) {
    console.error('Error syncing passwords:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

syncPasswords();
