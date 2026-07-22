const mongoose = require('mongoose');
const User = require('../apps/api/src/models/user.model');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
  console.log('Connected to DB');

  const users = await User.find();
  console.log('Users count:', users.length);
  for (const u of users) {
    console.log(`- User: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
