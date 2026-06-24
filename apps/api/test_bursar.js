const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement').then(async () => {
  const Procurement = mongoose.model('Procurement', require('./src/models/procurement.model').schema);
  const targetStage = 'bursar';
  const previousStages = ['hod', 'dean'];
  const query = {
    tenantId: 'uwu-main',
    status: { $nin: ['draft', 'rejected', 'cancelled', 'completed'] },
    'approvalChain': {
      $elemMatch: { stage: targetStage, status: 'pending' }
    }
  };
  const results = await Procurement.find(query);
  const filtered = results.filter(proc => {
    return previousStages.every(prevStage => {
      const entry = proc.approvalChain.find(a => a.stage === prevStage);
      return !entry || entry.status === 'approved';
    });
  });
  console.log('Found:', results.length, 'Filtered:', filtered.length);
  console.log(results.map(r => ({ status: r.status, chain: r.approvalChain.map(c => c.stage + ':' + c.status) })));
  process.exit(0);
});
