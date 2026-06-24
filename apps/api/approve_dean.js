const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement').then(async () => {
  const Procurement = mongoose.model('Procurement', require('./src/models/procurement.model').schema);
  const procs = await Procurement.find({ status: 'hod_approved' });
  for (const p of procs) {
    const deanStage = p.approvalChain.find(s => s.stage === 'dean');
    if (deanStage) {
      deanStage.status = 'approved';
      deanStage.actionDate = new Date();
      p.status = 'dean_approved';
      await p.save();
      console.log('Approved by Dean:', p._id);
    }
  }
  process.exit(0);
});
