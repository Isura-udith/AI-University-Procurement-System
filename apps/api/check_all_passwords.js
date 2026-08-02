const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-procurement';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = mongoose.connection.collection('users');
    const users = await User.find({}).toArray();
    console.log(`Checking ${users.length} users in database...`);
    for (const u of users) {
      if (u.password) {
        const isMatch = await bcrypt.compare('Demo@1234', u.password);
        console.log(`${u.role.padEnd(22)} (${u.email.padEnd(28)}): password matches Demo@1234? ${isMatch}`);
      } else {
        console.log(`${u.role.padEnd(22)} (${u.email.padEnd(28)}): NO PASSWORD FIELD`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
