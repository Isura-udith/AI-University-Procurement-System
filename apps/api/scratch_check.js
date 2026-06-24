const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/db');
const Procurement = require('./src/models/procurement.model');

async function check() {
  await connectDB();
  const procs = await Procurement.find({});
  console.log('--- Procurements ---');
  procs.forEach(p => {
    console.log(`ID: ${p._id}, Title: "${p.title}", Status: "${p.status}"`);
  });
  process.exit(0);
}
check();
