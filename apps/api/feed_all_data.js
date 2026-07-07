require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

// Import models
const User = require('./src/models/user.model');
const Role = require('./src/models/role.model');
const Vendor = require('./src/models/vendor.model');
const MasterPlan = require('./src/models/master.plan.model');
const AnnualPlan = require('./src/models/annual.plan.model');
const BudgetAllocation = require('./src/models/budget.allocation.model');
const Procurement = require('./src/models/procurement.model');
const Tender = require('./src/models/tender.model');
const Bid = require('./src/models/bid.model');
const Contract = require('./src/models/contract.model');
const Payment = require('./src/models/payment.model');
const { InventoryItem } = require('./src/models/inventory.model');
const Notification = require('./src/models/notification.model');
const Message = require('./src/models/message.model');
const MarketAlert = require('./src/models/market.alert.model');
const Document = require('./src/models/document.model');
const Report = require('./src/models/report.model');
const AIExplainabilityLog = require('./src/models/ai.explainability.log.model');

// Helper to read JSON feed files
const readFeedFile = (filename) => {
  const filePath = path.join(__dirname, 'data-feeds', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const feedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected to MongoDB.');

    const tenantId = 'uwu-main';

    // Clear existing collections
    console.log('Clearing old collections...');
    await Role.deleteMany({});
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await MasterPlan.deleteMany({});
    await AnnualPlan.deleteMany({});
    await BudgetAllocation.deleteMany({});
    await Procurement.deleteMany({});
    await Tender.deleteMany({});
    await Bid.deleteMany({});
    await Contract.deleteMany({});
    await Payment.deleteMany({});
    await InventoryItem.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});
    await MarketAlert.deleteMany({});
    await Document.deleteMany({});
    await Report.deleteMany({});
    await AIExplainabilityLog.deleteMany({});
    console.log('✓ Cleared database.');

    // 1. Roles
    console.log('Seeding Roles...');
    const rolesData = readFeedFile('roles.json');
    for (const r of rolesData) {
      await Role.create({ ...r, tenantId });
    }
    console.log(`✓ Seeded ${rolesData.length} roles.`);

    // 2. Users
    console.log('Seeding Users...');
    const usersData = readFeedFile('users.json');
    const userEmailMap = {}; // email -> _id
    for (const u of usersData) {
      const user = await User.create({
        ...u,
        password: 'Demo@1234',
        tenantId,
        isActive: true,
        isEmailVerified: true
      });
      userEmailMap[user.email] = user._id;
    }
    console.log(`✓ Seeded ${usersData.length} users.`);

    // 3. Vendors
    console.log('Seeding Vendors...');
    const vendorsData = readFeedFile('vendors.json');
    const vendorMap = {}; // companyName -> _id
    for (const v of vendorsData) {
      const vendor = await Vendor.create({
        ...v,
        tenantId,
        userId: userEmailMap[v.userEmail] || null
      });
      vendorMap[vendor.companyName] = vendor._id;
    }
    console.log(`✓ Seeded ${vendorsData.length} vendors.`);

    // 4. Master Plans
    console.log('Seeding 3-Year Master Procurement Plan...');
    const masterPlansData = readFeedFile('master_plans.json');
    const masterPlanMap = {}; // refCode -> masterPlan document
    const reqCodeMap = {}; // reqCode -> subdocument requirement _id
    for (const mp of masterPlansData) {
      const plan = new MasterPlan({
        ...mp,
        tenantId,
        createdBy: userEmailMap[mp.creatorEmail],
        approvalChain: [
          { stage: 'hod', approver: userEmailMap['hod@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Initial Submission' },
          { stage: 'dean', approver: userEmailMap['dean@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Dean Approved' },
          { stage: 'bursar', approver: userEmailMap['bursar@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Costing Checked', estimatedBudget: mp.bursarEstimatedBudget },
          { stage: 'finance_committee', approver: userEmailMap['finance@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Finance Committee Approved' },
          { stage: 'vice_chancellor', approver: userEmailMap['vc@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'VC Approved' },
          { stage: 'council', approver: userEmailMap['admin@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Council Activated Plan' }
        ]
      });
      await plan.save();
      masterPlanMap[mp.refCode] = plan;
      
      // Map requirements reqCode -> _id
      plan.requirements.forEach((req, idx) => {
        const sourceReq = mp.requirements[idx];
        if (sourceReq && sourceReq.reqCode) {
          reqCodeMap[sourceReq.reqCode] = req._id;
        }
      });
    }
    console.log(`✓ Seeded ${masterPlansData.length} master plans.`);

    // 5. Annual Plans
    console.log('Seeding 3 Annual Procurement Plans...');
    const annualPlansData = readFeedFile('annual_plans.json');
    const annualPlanMap = {}; // refCode -> annualPlan document
    for (const ap of annualPlansData) {
      const parentMasterPlan = masterPlanMap[ap.masterPlanRefCode];
      if (!parentMasterPlan) {
        throw new Error(`Master Plan ${ap.masterPlanRefCode} not found for Annual Plan ${ap.refCode}`);
      }

      // Map requirement IDs in items
      const items = ap.items.map(item => ({
        ...item,
        masterPlanRequirementId: reqCodeMap[item.reqCode]
      }));

      const plan = new AnnualPlan({
        ...ap,
        tenantId,
        masterPlanId: parentMasterPlan._id,
        masterPlanRef: parentMasterPlan.referenceNumber,
        createdBy: userEmailMap[ap.creatorEmail],
        items,
        internalApprovals: [
          { stage: 'dean', approver: userEmailMap['dean@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Approved' },
          { stage: 'bursar', approver: userEmailMap['bursar@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Approved' },
          { stage: 'finance_committee', approver: userEmailMap['finance@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Approved' },
          { stage: 'vice_chancellor', approver: userEmailMap['vc@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Approved' },
          { stage: 'council', approver: userEmailMap['admin@uwu.ac.lk'], status: 'approved', actionDate: new Date(), comments: 'Approved' }
        ],
        externalApprovals: [
          { body: 'ugc', status: 'approved', submittedAt: new Date(), approvedAt: new Date(), referenceNumber: `UGC/APP/${ap.planYear}/01`, allocatedAmount: ap.totalAllocatedBudget, notes: 'UGC allocation approved', recordedBy: userEmailMap['admin@uwu.ac.lk'] },
          { body: 'treasury', status: 'approved', submittedAt: new Date(), approvedAt: new Date(), referenceNumber: `TR/APP/${ap.planYear}/88`, allocatedAmount: ap.totalAllocatedBudget, notes: 'Treasury release approved', recordedBy: userEmailMap['admin@uwu.ac.lk'] },
          { body: 'parliament', status: 'approved', submittedAt: new Date(), approvedAt: new Date(), referenceNumber: `PARL/BUDGET/${ap.planYear}`, allocatedAmount: ap.totalAllocatedBudget, notes: 'National budget passed', recordedBy: userEmailMap['admin@uwu.ac.lk'] }
        ]
      });

      await plan.save();
      annualPlanMap[ap.refCode] = plan;

      // Link back to Master Plan
      parentMasterPlan.annualPlanIds.push(plan._id);
      await parentMasterPlan.save();
    }
    console.log(`✓ Seeded ${annualPlansData.length} annual plans.`);

    // 6. Budget Allocations
    console.log('Seeding 3 Budget Allocations...');
    const budgetAllocationsData = readFeedFile('budget_allocations.json');
    const budgetAllocationMap = {}; // annualPlanRefCode -> budgetAllocation _id
    for (const ba of budgetAllocationsData) {
      const linkedAnnualPlan = annualPlanMap[ba.annualPlanRefCode];
      if (!linkedAnnualPlan) {
        throw new Error(`Annual Plan ${ba.annualPlanRefCode} not found for Budget Allocation.`);
      }

      // Map HOD IDs in department allocations
      const departmentAllocations = ba.departmentAllocations.map(da => ({
        ...da,
        hodId: userEmailMap[da.hodEmail]
      }));

      const budget = new BudgetAllocation({
        ...ba,
        tenantId,
        annualPlanId: linkedAnnualPlan._id,
        distributedBy: userEmailMap[ba.vcEmail],
        distributedAt: new Date(),
        verifiedByBursar: userEmailMap[ba.bursarEmail],
        verifiedAt: new Date(),
        departmentAllocations
      });

      await budget.save();
      budgetAllocationMap[ba.annualPlanRefCode] = budget._id;

      // Link back to Annual Plan
      linkedAnnualPlan.budgetAllocationIds.push(budget._id);
      await linkedAnnualPlan.save();
    }
    console.log(`✓ Seeded ${budgetAllocationsData.length} budget allocations.`);

    // 7. Procurements
    console.log('Seeding Procurements...');
    const procurementsData = readFeedFile('procurements.json');
    const procurementMap = {}; // refCode -> _id
    for (const p of procurementsData) {
      const linkedAnnualPlan = annualPlanMap[p.annualPlanRefCode];
      if (!linkedAnnualPlan) {
        throw new Error(`Annual Plan ${p.annualPlanRefCode} not found for Procurement ${p.refCode}`);
      }

      // Resolve annualItem masterPlanRequirementId
      const matchedAnnualItem = linkedAnnualPlan.items.find(i => i.description === p.annualItemDesc);
      
      const proc = new Procurement({
        ...p,
        referenceNumber: p.refCode,
        tenantId,
        annualPlanId: linkedAnnualPlan._id,
        requestedBy: userEmailMap[p.requestedByEmail],
        budgetComplianceCheck: {
          checkedAt: new Date(),
          annualPlanPassed: true,
          budgetPassed: true,
          passed: true,
          annualPlanStatus: 'distribution_complete',
          annualPlanRef: linkedAnnualPlan.referenceNumber,
          annualItemDesc: p.annualItemDesc,
          remainingBudget: 1500000,
          requiredBudget: p.totalEstimatedCost,
          failureReason: null,
          requiresSpecialApproval: false
        }
      });
      await proc.save();
      procurementMap[p.refCode] = proc._id;
    }
    console.log(`✓ Seeded ${procurementsData.length} procurements.`);

    // 8. Tenders
    console.log('Seeding Tenders...');
    const tendersData = readFeedFile('tenders.json');
    const tenderMap = {}; // refCode -> _id
    for (const t of tendersData) {
      const procId = procurementMap[t.procurementRefCode];
      if (!procId) {
        throw new Error(`Procurement ${t.procurementRefCode} not found for Tender ${t.refCode}`);
      }

      const tender = await Tender.create({
        ...t,
        tenantId,
        procurementId: procId,
        bidSubmissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        bidOpeningDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
      });
      tenderMap[t.refCode] = tender._id;
    }
    console.log(`✓ Seeded ${tendersData.length} tenders.`);

    // 9. Bids
    console.log('Seeding Bids...');
    const bidsData = readFeedFile('bids.json');
    const bidMap = {}; // refCode -> _id
    for (const b of bidsData) {
      const tendId = tenderMap[b.tenderRefCode];
      const vendId = vendorMap[b.vendorName];
      if (!tendId || !vendId) {
        throw new Error(`Tender or Vendor not found for Bid ${b.refCode}`);
      }

      const bid = await Bid.create({
        ...b,
        tenantId,
        tenderId: tendId,
        vendorId: vendId
      });
      bidMap[b.refCode] = bid._id;
    }
    console.log(`✓ Seeded ${bidsData.length} bids.`);

    // 10. Contracts
    console.log('Seeding Contracts...');
    const contractsData = readFeedFile('contracts.json');
    const contractMap = {}; // contractNumber -> _id
    for (const c of contractsData) {
      const procId = procurementMap[c.procurementRefCode];
      const tendId = tenderMap[c.tenderRefCode];
      const bidId = bidMap[c.bidRefCode];
      const vendId = vendorMap[c.vendorName];

      if (!procId || !tendId || !bidId || !vendId) {
        throw new Error(`Failed to resolve dependencies for Contract ${c.contractNumber}`);
      }

      const contract = await Contract.create({
        ...c,
        tenantId,
        procurementId: procId,
        tenderId: tendId,
        bidId: bidId,
        vendorId: vendId,
        createdBy: userEmailMap[c.creatorEmail],
        startDate: new Date(c.startDate),
        endDate: new Date(c.endDate)
      });
      contractMap[c.contractNumber] = contract._id;
    }
    console.log(`✓ Seeded ${contractsData.length} contracts.`);

    // 11. Payments
    console.log('Seeding Payments...');
    const paymentsData = readFeedFile('payments.json');
    for (const pay of paymentsData) {
      const contractId = contractMap[pay.contractNumber];
      if (!contractId) {
        throw new Error(`Contract ${pay.contractNumber} not found for Payment ${pay.paymentNo}`);
      }

      const contract = await Contract.findById(contractId);
      if (!contract) {
        throw new Error(`Contract document not found in DB for ID: ${contractId}`);
      }

      await Payment.create({
        ...pay,
        tenantId,
        contractId,
        vendorId: contract.vendorId,
        procurementId: contract.procurementId,
        invoiceDate: new Date(pay.invoiceDate),
        createdBy: userEmailMap[pay.createdByEmail],
        approvedBy: userEmailMap[pay.approvedByEmail],
        approvedAt: new Date()
      });
    }
    console.log(`✓ Seeded ${paymentsData.length} payments.`);

    // 12. Inventory Items
    console.log('Seeding Inventory Items...');
    const inventoryData = readFeedFile('inventory.json');
    for (const inv of inventoryData) {
      const contractId = contractMap[inv.contractNumber];
      const supplierId = vendorMap[inv.vendorName];
      if (!contractId || !supplierId) {
        throw new Error(`Contract or Supplier not found for Inventory Item ${inv.itemCode}`);
      }

      const contract = await Contract.findById(contractId);

      await InventoryItem.create({
        ...inv,
        tenantId,
        contractId,
        supplierId,
        procurementId: contract.procurementId,
        lastReceivedAt: new Date()
      });
    }
    console.log(`✓ Seeded ${inventoryData.length} inventory items.`);

    // 13. Notifications
    console.log('Seeding Notifications...');
    const notificationsData = readFeedFile('notifications.json');
    for (const notif of notificationsData) {
      const recipientId = userEmailMap[notif.recipientEmail];
      if (!recipientId) {
        console.warn(`  ⚠ Skipping notification – recipient not found: ${notif.recipientEmail}`);
        continue;
      }
      await Notification.create({
        ...notif,
        tenantId,
        recipient: recipientId
      });
    }
    console.log(`✓ Seeded ${notificationsData.length} notifications.`);

    // 14. Messages
    console.log('Seeding Messages...');
    const messagesData = readFeedFile('messages.json');
    for (const msg of messagesData) {
      const senderId = userEmailMap[msg.senderEmail];
      if (!senderId) {
        console.warn(`  ⚠ Skipping message – sender not found: ${msg.senderEmail}`);
        continue;
      }
      const recipientId = msg.recipientEmail ? userEmailMap[msg.recipientEmail] : null;
      await Message.create({
        ...msg,
        tenantId,
        sender: senderId,
        recipient: recipientId || undefined,
        // recipientRole is already in msg if set
      });
    }
    console.log(`✓ Seeded ${messagesData.length} messages.`);

    // 15. Market Alerts
    console.log('Seeding Market Alerts...');
    const marketAlertsData = readFeedFile('market_alerts.json');
    for (const alert of marketAlertsData) {
      await MarketAlert.create({ ...alert, tenantId });
    }
    console.log(`✓ Seeded ${marketAlertsData.length} market alerts.`);

    // 16. Documents
    console.log('Seeding Documents...');
    const documentsData = readFeedFile('documents.json');
    for (const doc of documentsData) {
      const authorId = userEmailMap[doc.authorEmail];
      if (!authorId) {
        console.warn(`  ⚠ Skipping document – author not found: ${doc.authorEmail}`);
        continue;
      }
      await Document.create({
        ...doc,
        tenantId,
        author: authorId,
        relatedEntity: doc.relatedEntity || undefined
      });
    }
    console.log(`✓ Seeded ${documentsData.length} documents.`);

    // 17. Reports
    console.log('Seeding Reports...');
    const reportsData = readFeedFile('reports.json');
    for (const rep of reportsData) {
      const generatedById = userEmailMap[rep.generatedByEmail];
      await Report.create({
        ...rep,
        tenantId,
        generatedBy: generatedById || null,
        period: {
          ...rep.period,
          startDate: new Date(rep.period.startDate),
          endDate: new Date(rep.period.endDate)
        },
        submittedAt: rep.submittedAt ? new Date(rep.submittedAt) : undefined
      });
    }
    console.log(`✓ Seeded ${reportsData.length} reports.`);

    // 18. AI Explainability Logs
    console.log('Seeding AI Explainability Logs...');
    const aiLogsData = readFeedFile('ai_logs.json');
    for (const log of aiLogsData) {
      const generatedById = userEmailMap[log.generatedByEmail];
      await AIExplainabilityLog.create({
        ...log,
        tenantId,
        generatedBy: generatedById || null
      });
    }
    console.log(`✓ Seeded ${aiLogsData.length} AI explainability logs.`);

    console.log('\n=============================================');
    console.log('🎉 Database Seeding & Feeding Complete!');
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding/feeding database:', error);
    process.exit(1);
  }
};

feedDatabase();
