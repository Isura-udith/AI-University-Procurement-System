const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement').then(async () => {
  const Proc = mongoose.model('Procurement', new mongoose.Schema({}, { strict: false }));
  
  // Find all non-draft procurements
  const procs = await Proc.find({ 
    status: { $nin: ['draft', 'completed', 'cancelled'] } 
  }).select('title status faculty department approvalChain referenceNumber').lean();
  
  console.log('=== NON-DRAFT PROCUREMENTS ===');
  procs.forEach(p => {
    const chain = (p.approvalChain || []).map(a => `${a.stage}:${a.status}`).join(', ');
    console.log(`[${p.status}] ${p.referenceNumber} | faculty: '${p.faculty}' | dept: '${p.department}' | chain: ${chain}`);
  });

  // Now simulate the dean's pending approvals query
  console.log('\n=== SIMULATING DEAN PENDING QUERY ===');
  const deanFaculty = 'Medicine';
  const escaped = deanFaculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const deanQuery = {
    status: { $nin: ['draft', 'rejected', 'cancelled', 'completed'] },
    approvalChain: { $elemMatch: { stage: 'dean', status: 'pending' } },
    $or: [
      { faculty: { $regex: escaped, $options: 'i' } },
      { department: { $regex: escaped, $options: 'i' } }
    ]
  };
  
  console.log('Query:', JSON.stringify(deanQuery, null, 2));
  const results = await Proc.find(deanQuery).lean();
  console.log(`Found ${results.length} results for dean`);
  results.forEach(r => {
    const chain = (r.approvalChain || []).map(a => `${a.stage}:${a.status}`).join(', ');
    console.log(`  [${r.status}] ${r.referenceNumber} | faculty: '${r.faculty}' | chain: ${chain}`);
  });

  // Also check without the $or filter to see all dean-pending items
  console.log('\n=== ALL DEAN-PENDING (NO FACULTY FILTER) ===');
  const allDeanPending = await Proc.find({
    status: { $nin: ['draft', 'rejected', 'cancelled', 'completed'] },
    approvalChain: { $elemMatch: { stage: 'dean', status: 'pending' } }
  }).select('referenceNumber status faculty department approvalChain').lean();
  
  console.log(`Found ${allDeanPending.length} total dean-pending items`);
  allDeanPending.forEach(r => {
    const chain = (r.approvalChain || []).map(a => `${a.stage}:${a.status}`).join(', ');
    console.log(`  [${r.status}] ${r.referenceNumber} | faculty: '${r.faculty}' | dept: '${r.department}' | chain: ${chain}`);
  });

  // Check HOD-approved items that have a dean stage
  console.log('\n=== HOD-APPROVED WITH DEAN STAGE ===');
  const hodApproved = await Proc.find({
    status: 'hod_approved',
    'approvalChain.stage': 'dean'
  }).select('referenceNumber status faculty department approvalChain').lean();
  
  console.log(`Found ${hodApproved.length} hod_approved items with dean stage`);
  hodApproved.forEach(r => {
    const chain = (r.approvalChain || []).map(a => `${a.stage}:${a.status}`).join(', ');
    console.log(`  ${r.referenceNumber} | faculty: '${r.faculty}' | dept: '${r.department}' | chain: ${chain}`);
  });

  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
