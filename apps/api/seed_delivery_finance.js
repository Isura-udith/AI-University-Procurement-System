require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Vendor = require('./src/models/vendor.model');
const Procurement = require('./src/models/procurement.model');
const Tender = require('./src/models/tender.model');
const Bid = require('./src/models/bid.model');
const Contract = require('./src/models/contract.model');
const Payment = require('./src/models/payment.model');
const connectDB = require('./src/config/db');

const seedDeliveryFinance = async () => {
  try {
    await connectDB();
    console.log('─── Starting Delivery & Finance Seeding ───');

    const tenantId = 'uwu-main';

    // Drop stale vendorCode index if present
    try {
      await mongoose.connection.db.collection('vendors').dropIndex('vendorCode_1');
      console.log('✓ Dropped stale vendorCode index.');
    } catch (e) {
      // Index might not exist or already dropped
    }

    try {
      await mongoose.connection.db.collection('vendors').dropIndex('registrationNo_1');
      console.log('✓ Dropped stale registrationNo index.');
    } catch (e) {
      // Index might not exist or already dropped
    }

    try {
      await mongoose.connection.db.collection('bids').dropIndex('bidNo_1');
      console.log('✓ Dropped stale bidNo index.');
    } catch (e) {
      // Index might not exist or already dropped
    }

    try {
      await mongoose.connection.db.collection('contracts').dropIndex('contractNo_1');
      console.log('✓ Dropped stale contractNo index.');
    } catch (e) {
      // Index might not exist or already dropped
    }

    // Clear existing collections for delivery/finance demo data
    await Vendor.deleteMany({ tenantId });
    await Procurement.deleteMany({ tenantId });
    await Tender.deleteMany({ tenantId });
    await Bid.deleteMany({ tenantId });
    await Contract.deleteMany({ tenantId });
    await Payment.deleteMany({ tenantId });
    console.log('✓ Cleared old database collections.');

    // Find demo users
    const superAdmin = await User.findOne({ email: 'superadmin@uwu.ac.lk' });
    const storeManager = await User.findOne({ email: 'stores@uwu.ac.lk' });
    const bursar = await User.findOne({ email: 'bursar@uwu.ac.lk' });
    const supplierUser = await User.findOne({ email: 'supplier@vendor.lk' });

    let supplier2User = await User.findOne({ email: 'supplier2@vendor.lk' });
    if (!supplier2User && supplierUser) {
      supplier2User = await User.create({
        role: 'supplier',
        firstName: 'TechVision',
        lastName: 'Supplier',
        email: 'supplier2@vendor.lk',
        employeeId: 'UWU-EXT-002',
        password: 'Demo@1234',
        tenantId,
        isActive: true,
        isEmailVerified: true,
        permissions: ['submit_bid', 'submit_appeal', 'request_debriefing']
      });
    }

    if (!superAdmin || !storeManager || !bursar) {
      console.error('❌ Essential demo users not found! Please run node seed.js first.');
      process.exit(1);
    }

    // 1. Create Vendors
    const medTech = await Vendor.create({
      tenantId,
      userId: supplierUser?._id || null,
      companyName: 'MedTech Solutions (Pvt) Ltd',
      registrationNumber: 'PV-12345',
      vendorCode: 'VND-2026-0001',
      contactPerson: 'Mr. K. Perera',
      email: 'perera@medtech.lk',
      phone: '+94 77 123 4567',
      address: { street: '12 Galle Road', city: 'Colombo 03', district: 'Colombo', province: 'Western', postalCode: '00300' },
      status: 'preferred',
      performanceScore: 84,
    });

    const techVision = await Vendor.create({
      tenantId,
      userId: supplier2User?._id || null,
      companyName: 'TechVision Asia',
      registrationNumber: 'PV-98765',
      vendorCode: 'VND-2026-0002',
      contactPerson: 'Mr. S. Dias',
      email: 'dias@techvision.lk',
      phone: '+94 77 987 6543',
      address: { street: '45 Kandy Road', city: 'Kiribathgoda', district: 'Gampaha', province: 'Western', postalCode: '11600' },
      status: 'preferred',
      performanceScore: 92,
    });
    console.log('✓ Seeded 2 Vendors.');

    // 2. Create Procurements
    const proc1 = await Procurement.create({
      tenantId,
      title: 'Supply of Laboratory Microscopes and Equipment',
      description: 'Supply, delivery, installation, and commissioning of 10 units of advanced research microscopes with digital imaging systems for the Faculty of Medicine.',
      category: 'Goods',
      totalEstimatedCost: 38500000,
      requestedBy: superAdmin._id,
      department: 'Medicine',
      faculty: 'Medicine',
      status: 'in_progress',
      currentStage: 12,
    });

    const proc2 = await Procurement.create({
      tenantId,
      title: 'IT Infrastructure Upgrade',
      description: 'Network switches, optical fiber routing and installation for the main library and IT labs.',
      category: 'Goods',
      totalEstimatedCost: 22000000,
      requestedBy: superAdmin._id,
      department: 'Procurement Management Division',
      status: 'in_progress',
      currentStage: 12,
    });
    console.log('✓ Seeded 2 Procurements.');

    // 3. Create Tenders
    const tender1 = await Tender.create({
      tenantId,
      procurementId: proc1._id,
      title: 'Tender for Laboratory Microscopes',
      description: 'Open tender for Faculty of Medicine lab equipment',
      status: 'awarded',
      bidSubmissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      bidOpeningDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    });

    const tender2 = await Tender.create({
      tenantId,
      procurementId: proc2._id,
      title: 'Tender for IT Infrastructure Upgrade',
      description: 'Open tender for university campus wide network equipment',
      status: 'awarded',
      bidSubmissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      bidOpeningDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    });
    console.log('✓ Seeded 2 Tenders.');

    // 4. Create Bids
    const bid1 = await Bid.create({
      tenantId,
      tenderId: tender1._id,
      vendorId: medTech._id,
      totalBidAmount: 38500000,
      status: 'awarded',
      combinedScore: 88,
    });

    // Unsuccessful bid on tender1 to test appeal/debriefing
    await Bid.create({
      tenantId,
      tenderId: tender1._id,
      vendorId: techVision._id,
      totalBidAmount: 41000000,
      status: 'technically_evaluated',
      combinedScore: 78,
    });

    const bid2 = await Bid.create({
      tenantId,
      tenderId: tender2._id,
      vendorId: techVision._id,
      totalBidAmount: 22000000,
      status: 'awarded',
      combinedScore: 92,
    });

    // Unsuccessful bid on tender2 to test appeal/debriefing
    await Bid.create({
      tenantId,
      tenderId: tender2._id,
      vendorId: medTech._id,
      totalBidAmount: 24500000,
      status: 'technically_evaluated',
      combinedScore: 82,
    });
    console.log('✓ Seeded 2 Bids.');

    // 5. Create Contracts
    const contract1 = await Contract.create({
      tenantId,
      procurementId: proc1._id,
      tenderId: tender1._id,
      bidId: bid1._id,
      vendorId: medTech._id,
      contractNumber: 'CNT-2026-0001',
      title: 'Supply of Laboratory Microscopes and Equipment',
      description: 'Supply, delivery, installation, and commissioning of 10 units of advanced research microscopes with digital imaging systems for the Faculty of Medicine.',
      contractType: 'goods',
      contractValue: 38500000,
      retentionPercentage: 10,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-09-30'),
      status: 'active',
      deliverables: [
        { description: 'Lab Microscopes (10 units)', expectedDate: new Date('2026-06-30'), status: 'pending' },
        { description: 'Calibration Accessories', expectedDate: new Date('2026-07-15'), status: 'pending' },
      ],
      paymentSchedule: [
        { milestone: 'Advance Payment (10%)', amount: 3850000, dueDate: new Date('2026-04-15'), status: 'paid' },
        { milestone: 'Delivery & Installation (60%)', amount: 23100000, dueDate: new Date('2026-06-30'), status: 'pending' },
        { milestone: 'Training & Handover (20%)', amount: 7700000, dueDate: new Date('2026-08-15'), status: 'pending' },
        { milestone: 'Retention Release (10%)', amount: 3850000, dueDate: new Date('2026-09-30'), status: 'pending' },
      ],
      createdBy: superAdmin._id,
    });

    const contract2 = await Contract.create({
      tenantId,
      procurementId: proc2._id,
      tenderId: tender2._id,
      bidId: bid2._id,
      vendorId: techVision._id,
      contractNumber: 'CNT-2026-0002',
      title: 'IT Infrastructure Upgrade',
      description: 'Network switches and fiber optic cable installation.',
      contractType: 'goods',
      contractValue: 22000000,
      retentionPercentage: 10,
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-08-15'),
      status: 'in_progress',
      deliverables: [
        { description: 'Network Switches (25 units)', expectedDate: new Date('2026-05-30'), status: 'delivered', deliveredDate: new Date('2026-05-28'), acceptanceReport: 'GRN-2026-035' },
        { description: 'Fiber Optic Cables (2000m)', expectedDate: new Date('2026-06-15'), status: 'accepted', deliveredDate: new Date('2026-06-02'), acceptanceReport: 'GRN-2026-038' },
      ],
      paymentSchedule: [
        { milestone: 'Initial Infrastructure setup', amount: 4400000, dueDate: new Date('2026-05-01'), status: 'paid' },
        { milestone: 'Hardware Delivery', amount: 15400000, dueDate: new Date('2026-06-15'), status: 'pending' },
        { milestone: 'Testing & Commissioning', amount: 2200000, dueDate: new Date('2026-08-15'), status: 'pending' },
      ],
      createdBy: superAdmin._id,
    });

    console.log('✓ Seeded 2 Contracts.');

    // Update procurements to link back to contracts
    proc1.contractId = contract1._id;
    await proc1.save();
    proc2.contractId = contract2._id;
    await proc2.save();

    // 6. Create Payments
    // Payment 1 (Already Paid advance for CNT-2026-0001)
    await Payment.create({
      tenantId,
      contractId: contract1._id,
      procurementId: proc1._id,
      vendorId: medTech._id,
      paymentNumber: 'PAY-2026-0001',
      amount: 3850000,
      paymentType: 'advance',
      status: 'paid',
      threeWayMatchStatus: 'matched',
      purchaseOrder: { poNumber: 'CNT-2026-0001', poDate: new Date('2026-03-28'), poAmount: 3850000 },
      goodsReceivedNote: { grnNumber: 'GRN-2026-001', grnDate: new Date('2026-04-05'), items: [{ description: 'Signed Agreement Documentation', orderedQty: 1, receivedQty: 1, acceptedQty: 1 }] },
      invoice: { invoiceNumber: 'INV-MT-2026-001', invoiceDate: new Date('2026-04-10'), invoiceAmount: 3850000 },
      deductions: [{ description: 'Retention (10%)', amount: 385000, type: 'retention' }],
      netAmount: 3465000,
      paidAt: new Date('2026-04-16'),
      paidBy: bursar._id,
      createdBy: superAdmin._id,
    });

    // Payment 2 (Awaiting match for CNT-2026-0002 - Hardware Delivery milestone)
    await Payment.create({
      tenantId,
      contractId: contract2._id,
      procurementId: proc2._id,
      vendorId: techVision._id,
      paymentNumber: 'PAY-2026-0002',
      amount: 15400000,
      paymentType: 'progress',
      status: 'pending_match',
      threeWayMatchStatus: 'pending',
      purchaseOrder: { poNumber: 'CNT-2026-0002', poDate: new Date('2026-04-15'), poAmount: 15400000 },
      goodsReceivedNote: {
        grnNumber: 'GRN-2026-035',
        grnDate: new Date('2026-05-28'),
        receivedBy: storeManager._id,
        items: [
          { description: 'Network Switches (25 units)', orderedQty: 25, receivedQty: 23, acceptedQty: 23 } // Discrepancy by default!
        ]
      },
      invoice: { invoiceNumber: 'INV-TV-2026-004', invoiceDate: new Date('2026-05-29'), invoiceAmount: 15400000 },
      deductions: [{ description: 'Retention (10%)', amount: 1540000, type: 'retention' }],
      netAmount: 13860000,
      createdBy: superAdmin._id,
    });

    console.log('✓ Seeded 2 Payments.');
    console.log('─── Seeding Complete! ───');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
};

seedDeliveryFinance();
