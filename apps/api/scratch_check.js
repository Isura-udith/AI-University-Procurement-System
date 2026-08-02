const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-procurement';

mongoose.connect(MONGODB_URI).then(async () => {
  const User = mongoose.connection.collection('users');
  const users = await User.find({}).toArray();
  console.log("Total users found:", users.length);
  const statusSummary = users.map(u => ({
    email: u.email,
    role: u.role,
    loginAttempts: u.loginAttempts,
    lockUntil: u.lockUntil,
    isActive: u.isActive,
    status: u.status
  }));
  console.log(JSON.stringify(statusSummary, null, 2));
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});
