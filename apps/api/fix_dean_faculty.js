const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // Update the dean user's faculty to 'Applied Sciences' to match the existing test procurements
  const result = await User.updateOne(
    { role: 'dean', email: 'dean@uwu.ac.lk' },
    { $set: { faculty: 'Applied Sciences', department: 'Applied Sciences' } }
  );
  
  console.log('Updated dean user:', result.modifiedCount > 0 ? 'SUCCESS' : 'NO CHANGE');
  
  // Verify
  const dean = await User.findOne({ role: 'dean' }).select('firstName lastName email role faculty department').lean();
  console.log('Dean user now:', JSON.stringify(dean, null, 2));
  
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
