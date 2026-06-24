const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Procurement = require('./src/models/procurement.model');
const procurementService = require('./src/services/procurement.service');
require('dotenv').config();

async function testNoDeanFlow() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
    console.log('Connected to DB');

    // Find non-academic user (e.g. Finance Division)
    const financeUser = await User.findOne({ email: 'finance@uwu.ac.lk' });
    if (!financeUser) throw new Error('Finance user not found');
    
    // Find HOD for Finance Division
    const hod = await User.findOne({ email: 'bursar@uwu.ac.lk' }); // Bursar acts as HOD for Finance? Actually let's use a brand new department without a Dean.
    
    // Let's create a dummy procurement request directly
    const procurement = new Procurement({
      tenantId: 'uwu-main',
      title: 'Test No Dean Request',
      description: 'Test',
      category: 'Goods',
      totalEstimatedCost: 100000,
      currency: 'LKR',
      requestedBy: financeUser._id,
      department: 'Finance Division',
      // NO FACULTY
      items: [{ description: 'Test', category: 'Goods', quantity: 1, unit: 'nos', estimatedUnitPrice: 100000, estimatedTotalPrice: 100000 }],
      status: 'draft',
      currentStage: 1
    });
    await procurement.save();

    // Submit it
    await procurementService.submit(procurement._id, financeUser._id, 'uwu-main');
    console.log('Submitted procurement. Approval Chain:', procurement.approvalChain.map(s => s.stage));

    const updated = await Procurement.findById(procurement._id);
    
    // Find who can approve HOD
    // Bursar can approve as admin or we can just use super admin
    const superAdmin = await User.findOne({ role: 'super_admin' });
    
    // Approve as HOD
    await procurementService.approve(updated._id, superAdmin._id, 'super_admin', 'hod', 'Approved by HOD', 'uwu-main');
    console.log('Approved HOD');

    // Check if Bursar sees it
    const bursar = await User.findOne({ role: 'bursar' });
    const pendingForBursar = await procurementService.getMyPendingApprovals(bursar._id, 'bursar', 'uwu-main', {});
    
    console.log('Bursar pending queue size:', pendingForBursar.length);
    const found = pendingForBursar.find(p => p._id.toString() === updated._id.toString());
    if (found) {
      console.log('SUCCESS: Bursar sees the request immediately after HOD!');
    } else {
      console.log('FAIL: Bursar does NOT see the request.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

testNoDeanFlow();
