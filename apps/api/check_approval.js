require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Procurement = require('./src/models/procurement.model');

async function run() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uwu_procurement';
    await mongoose.connect(uri);

    console.log('\n--- DIAGNOSING PROCUREMENT OFFICER APPROVAL ISSUE ---');
    
    // 1. Check Procurement Officer User
    const po = await User.findOne({ email: 'procurement@uwu.ac.lk' });
    if (po) {
      console.log('PO User Info:');
      console.log('  _id:', po._id);
      console.log('  email:', po.email);
      console.log('  role:', po.role);
      console.log('  department:', po.department);
      console.log('  permissions:', po.permissions);
    } else {
      console.log('Procurement Officer user NOT found!');
    }

    // 2. Check Pending Requisitions
    const pendingRequisitions = await Procurement.find({
      status: { $in: ['submitted', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'pmd_review'] }
    });
    console.log(`\nFound ${pendingRequisitions.length} pending requisitions:`);
    for (const req of pendingRequisitions) {
      console.log(`\nRequisition: ${req.referenceNumber} ("${req.title}")`);
      console.log('  status:', req.status);
      console.log('  currentStage:', req.currentStage);
      console.log('  approvalChain:');
      req.approvalChain.forEach((a, i) => {
        console.log(`    [${i}] stage: ${a.stage}, status: ${a.status}, approver: ${a.approver}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
