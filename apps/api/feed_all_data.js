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
const { InventoryItem, GRN, Issuance } = require('./src/models/inventory.model');
const Notification = require('./src/models/notification.model');
const Message = require('./src/models/message.model');
const MarketAlert = require('./src/models/market.alert.model');
const Document = require('./src/models/document.model');
const KnowledgeDocument = require('./src/models/knowledge.document.model');
const Report = require('./src/models/report.model');
const AuditLog = require('./src/models/audit.log.model');
const AIExplainabilityLog = require('./src/models/ai.explainability.log.model');
const ChatSession = require('./src/models/chat.session.model');
const aiService = require('./src/services/ai.service');

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
    await GRN.deleteMany({});
    await Issuance.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});
    await MarketAlert.deleteMany({});
    await Document.deleteMany({});
    await KnowledgeDocument.deleteMany({});
    await Report.deleteMany({});
    await AuditLog.collection.drop().catch(() => {});
    await AIExplainabilityLog.deleteMany({});
    await ChatSession.deleteMany({});
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
        console.warn(`Master Plan ${ap.masterPlanRefCode} not found for Annual Plan ${ap.refCode}, skipping...`);
        continue;
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

    // 12b. Seed Goods Receipt Notes (GRNs)
    console.log('Seeding GRNs & Issuances...');
    const storeUser = userEmailMap['store@uwu.ac.lk'] || Object.values(userEmailMap)[0];
    const createdItems = await InventoryItem.find({ tenantId });
    if (createdItems.length > 0) {
      const sampleItem = createdItems[0];
      const sampleGrn = await GRN.create({
        tenantId,
        grnNumber: 'UWU/GRN/2026/0001',
        procurementId: sampleItem.procurementId,
        contractId: sampleItem.contractId,
        supplierId: sampleItem.supplierId,
        supplierName: 'MedTech Solutions (Pvt) Ltd',
        supplierInvoiceNumber: 'INV-2026-901',
        supplierDeliveryNoteNumber: 'DN-2026-442',
        deliveryDate: new Date(),
        receivedBy: storeUser,
        overallInspectionStatus: 'passed',
        status: 'inventory_updated',
        storeLocation: 'Main Store Room A',
        items: [{
          inventoryItemId: sampleItem._id,
          description: sampleItem.description,
          orderedQuantity: 10,
          receivedQuantity: 10,
          rejectedQuantity: 0,
          unit: sampleItem.unit,
          unitCost: sampleItem.unitCost,
          inspectionStatus: 'passed'
        }],
        totalReceivedValue: (sampleItem.unitCost || 0) * 10
      });

      // Sample Issuance
      await Issuance.create({
        tenantId,
        issuanceNumber: 'UWU/ISS/2026/0001',
        procurementId: sampleItem.procurementId,
        grnId: sampleGrn._id,
        requestingDepartment: 'Science & Technology',
        requestingFaculty: 'Faculty of Applied Sciences',
        requestedBy: storeUser,
        issuedBy: storeUser,
        issuedAt: new Date(),
        status: 'issued',
        items: [{
          inventoryItemId: sampleItem._id,
          description: sampleItem.description,
          issuedQuantity: 2,
          unit: sampleItem.unit,
          unitCost: sampleItem.unitCost,
          purpose: 'Laboratory Research Work'
        }]
      });
      console.log('✓ Seeded sample GRN & Issuance records.');
    }

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

    // 18b. Seed Audit Logs
    console.log('Seeding Sample Audit Trail Logs...');
    const adminUserId = userEmailMap['admin@uwu.ac.lk'];
    const vcUserId = userEmailMap['vc@uwu.ac.lk'];
    const bursarUserId = userEmailMap['bursar@uwu.ac.lk'];

    const sampleAuditLogs = [
      {
        tenantId,
        userId: adminUserId,
        userEmail: 'admin@uwu.ac.lk',
        userName: 'Saman Kumara',
        userRole: 'admin',
        action: 'LOGIN_SUCCESS',
        category: 'authentication',
        severity: 'info',
        description: 'Saman Kumara logged in successfully from PMD office network',
        ipAddress: '192.168.1.102',
        status: 'success',
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        tenantId,
        userId: vcUserId,
        userEmail: 'vc@uwu.ac.lk',
        userName: 'Prof. Jayantha Lal',
        userRole: 'vc',
        action: 'ROLE_CHANGED',
        category: 'user_management',
        severity: 'warning',
        description: 'Updated procurement approval thresholds for Faculty of Technology',
        ipAddress: '192.168.1.50',
        status: 'success',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000)
      },
      {
        tenantId,
        userId: bursarUserId,
        userEmail: 'bursar@uwu.ac.lk',
        userName: 'Nimal Perera',
        userRole: 'bursar',
        action: 'LOGIN_FAILED',
        category: 'authentication',
        severity: 'warning',
        description: 'Failed login attempt for bursar@uwu.ac.lk (Invalid Credentials)',
        ipAddress: '203.115.26.14',
        status: 'failure',
        failureReason: 'Invalid password provided',
        createdAt: new Date(Date.now() - 5 * 3600 * 1000)
      },
      {
        tenantId,
        userId: adminUserId,
        userEmail: 'admin@uwu.ac.lk',
        userName: 'Saman Kumara',
        userRole: 'admin',
        action: 'ACCOUNT_LOCKED',
        category: 'security',
        severity: 'critical',
        description: 'Account temporarily flagged following multiple access attempts from unrecognised subnet',
        ipAddress: '45.132.18.99',
        status: 'blocked',
        failureReason: 'IP Geolocation restriction rule triggered',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000)
      },
      {
        tenantId,
        userId: adminUserId,
        userEmail: 'admin@uwu.ac.lk',
        userName: 'Saman Kumara',
        userRole: 'admin',
        action: 'USER_CREATED_BY_ADMIN',
        category: 'administrative',
        severity: 'info',
        description: 'Saman Kumara generated quarterly GOSL compliance report',
        ipAddress: '192.168.1.102',
        status: 'success',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000)
      }
    ];

    for (const al of sampleAuditLogs) {
      await AuditLog.create(al);
    }
    console.log(`✓ Seeded ${sampleAuditLogs.length} audit logs.`);

    // 18c. Seed AI Chat Sessions
    console.log('Seeding Sample AI Chat Sessions...');
    const procurementOfficerId = userEmailMap['procurement@uwu.ac.lk'] || adminUserId;
    const hodUserId = userEmailMap['hod@uwu.ac.lk'] || adminUserId;

    const sampleChatSessions = [
      {
        sessionId: 'session-seed-001',
        userId: adminUserId,
        tenantId,
        title: 'GOSL Shopping Method Thresholds & Guidelines',
        isPinned: true,
        isArchived: false,
        messageCount: 2,
        lastActivityAt: new Date(Date.now() - 2 * 3600 * 1000),
        messages: [
          {
            role: 'user',
            content: 'What are the limits & rules for the Shopping method under GOSL Guidelines?',
            timestamp: new Date(Date.now() - 2 * 3600 * 1000 - 30000),
          },
          {
            role: 'assistant',
            content: '### GOSL Shopping Method Guidelines (PG-2024 & PFM Act)\n\nUnder the Sri Lanka Government Procurement Guidelines (2024 Updates):\n\n- **Monetary Threshold**: Applicable for procurements up to **LKR 10,000,000 (10 Million LKR)** for Goods & Services.\n- **Quotation Requirements**: Minimum **3 competitive quotations** must be obtained from registered suppliers.\n- **Technical Evaluation**: The Departmental Procurement Committee (DPC) / TEC evaluates compliance with technical specifications.\n- **Budget Compliance**: A valid budget reservation (Budget Lock) must be active prior to issuing Purchase Orders.\n\n*Note: Splitting contracts to avoid National Competitive Bidding (NCB) threshold is strictly prohibited under PFM Act Section 44.*',
            timestamp: new Date(Date.now() - 2 * 3600 * 1000),
            metadata: {
              usedTools: ['gosl_compliance_engine', 'semantic_rag_knowledge_store'],
              sourceDocuments: [
                { pageContent: 'GOSL Procurement Manual Chapter 3 - Shopping Method Limits: LKR 10,000,000 max per procurement entity.', metadata: { source: 'GOSL_Procurement_Manual_2024.pdf' } }
              ],
              processingTimeMs: 1240,
            },
            rating: 1,
          }
        ]
      },
      {
        sessionId: 'session-seed-002',
        userId: adminUserId,
        tenantId,
        title: '3-Way Match Process for Store Items',
        isPinned: false,
        isArchived: false,
        messageCount: 2,
        lastActivityAt: new Date(Date.now() - 12 * 3600 * 1000),
        messages: [
          {
            role: 'user',
            content: 'Explain the 3-Way Match process required for Store item verification.',
            timestamp: new Date(Date.now() - 12 * 3600 * 1000 - 45000),
          },
          {
            role: 'assistant',
            content: '### 3-Way Match Audit Rule for Payment Disbursement\n\nBefore releasing payments to vendors, the Finance & Audit Division verifies **three documents**:\n\n1. **Approved Purchase Order (PO)**: Validates approved quantities, unit rates, and total contract price.\n2. **Signed Goods Received Note (GRN)**: Store Manager confirmation of physical delivery, quality inspection, and store entry.\n3. **Supplier Tax Invoice**: Checks invoice serial, VAT calculations, and bank details.\n\n| Document | Authority | Key Check |\n|---|---|---|\n| Purchase Order | Procurement Division | Budget Lock & Contract Terms |\n| GRN | Store Room / Inspection Committee | Item Code, Quantity & Inspection Status |\n| Supplier Invoice | Finance Division | Unit Price & Bank Account Match |\n\n*Payment disbursements cannot be generated unless all 3 documents match with 0 variance.*',
            timestamp: new Date(Date.now() - 12 * 3600 * 1000),
            metadata: {
              usedTools: ['payment_matching_engine'],
              sourceDocuments: [
                { pageContent: 'UWU Store SOP Chapter 5: Mandatory 3-Way Match before Bursar approval.', metadata: { source: 'UWU_Store_SOP_2025.pdf' } }
              ],
              processingTimeMs: 980,
            },
            rating: 1,
          }
        ]
      },
      {
        sessionId: 'session-seed-003',
        userId: procurementOfficerId,
        tenantId,
        title: 'Bid Evaluation Committee Risk Scoring Model',
        isPinned: true,
        isArchived: false,
        messageCount: 2,
        lastActivityAt: new Date(Date.now() - 24 * 3600 * 1000),
        messages: [
          {
            role: 'user',
            content: 'How should the Bid Evaluation Committee (TEC) compute risk scores?',
            timestamp: new Date(Date.now() - 24 * 3600 * 1000 - 20000),
          },
          {
            role: 'assistant',
            content: '### TEC Procurement Risk Assessment Formula\n\nThe AI Risk Scoring Module computes a **0–100 Weighted Risk Score** based on 5 parameters:\n\n- **Financial Threshold (25%)**: Price variance against Engineer\'s Estimate (>15% deviation flags risk).\n- **Vendor Performance (25%)**: Past contract completion history & supplier rating tier.\n- **Delivery Timeframes (20%)**: Unrealistic delivery times relative to industry averages.\n- **Specification Restrictiveness (15%)**: Single-brand vendor lock-in terms.\n- **Documentation Completeness (15%)**: Missing CIDA registration or bid bond securities.\n\n*Scores above 60 require mandatory Bursar & Internal Audit pre-check prior to award.*',
            timestamp: new Date(Date.now() - 24 * 3600 * 1000),
            metadata: {
              usedTools: ['risk_analysis_engine'],
              sourceDocuments: [],
              processingTimeMs: 1150,
            },
            rating: 1,
          }
        ]
      }
    ];

    for (const sessionData of sampleChatSessions) {
      await ChatSession.create(sessionData);
    }
    console.log(`✓ Seeded ${sampleChatSessions.length} sample AI Chat Sessions.`);


    // 19. Index Documents Directory for RAG
    console.log('Indexing official procurement Documents folder for RAG...');
    try {
      const indexedDocs = await aiService.indexDocumentsFolder();
      console.log(`✓ Indexed ${indexedDocs.length} procurement PDF/TXT documents into Knowledge Base RAG store.`);
    } catch (ragErr) {
      console.warn('⚠️  Knowledge document indexing warning:', ragErr.message);
    }

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
