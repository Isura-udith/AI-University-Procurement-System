require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement').then(async () => {
  const Procurement = require('./src/models/procurement.model');
  const data = await Procurement.find({ tenantId: 'uwu-main', status: { $ne: 'draft' } }).limit(50);
  console.log(JSON.stringify(data, null, 2));
  process.exit();
});
