/**
 * Workflow Notification Triggers
 * Maps automated notifications to the 13 procurement lifecycle stages.
 * Each trigger resolves recipients, determines channels, and dispatches via NotificationEngine.
 */
const User = require('../models/user.model');
const notificationEngine = require('./notification.engine');
const logger = require('../config/logger');
const env = require('../config/env');

const CLIENT = env.CLIENT_URL;

/**
 * Resolve users by role within a tenant.
 */
const findByRole = async (tenantId, role) => {
  return User.find({ tenantId, role, isActive: true }).select('_id email role firstName lastName').lean();
};

const findByRoles = async (tenantId, roles) => {
  return User.find({ tenantId, role: { $in: roles }, isActive: true }).select('_id email role firstName lastName').lean();
};

const triggers = {
  // ─── STAGE 1: Requisition Initiation ───────────────────────────
  async requisitionSubmitted(tenantId, procurement, submitter) {
    const hods = await findByRole(tenantId, 'department_head');
    // Notify HOD
    await notificationEngine.sendBulk(hods, {
      tenantId, type: 'requisition_submitted',
      title: 'New Requisition Pending Departmental Approval',
      message: `Requisition ${procurement.referenceNumber} submitted by ${submitter.firstName} ${submitter.lastName} requires your review.`,
      priority: 'normal', severity: 'info', category: 'approval',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 1,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, title: procurement.title, category: procurement.category, totalCost: procurement.totalEstimatedCost, department: procurement.department, requestedBy: `${submitter.firstName} ${submitter.lastName}`, submittedAt: procurement.submittedAt },
    });
    // Confirm to submitter
    await notificationEngine.send({
      tenantId, recipientId: submitter._id, recipientEmail: submitter.email, recipientRole: submitter.role,
      type: 'requisition_confirmed', title: 'Requisition Successfully Submitted',
      message: `Your requisition ${procurement.referenceNumber} has been submitted for review.`,
      priority: 'low', severity: 'success', category: 'workflow',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 1,
      channels: { inApp: true, email: false },
      metadata: { referenceNumber: procurement.referenceNumber, title: procurement.title },
    });
  },

  // ─── STAGE 2: Department-Level Concurrence ─────────────────────
  async hodApproved(tenantId, procurement, approver, requestedBy) {
    const deans = await findByRole(tenantId, 'dean');
    await notificationEngine.sendBulk(deans, {
      tenantId, type: 'hod_approved',
      title: 'Requisition Cleared by HOD — Awaiting Faculty Approval',
      message: `Requisition ${procurement.referenceNumber} approved by HOD. Awaiting your faculty approval.`,
      priority: 'normal', severity: 'info', category: 'approval',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 2,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, title: procurement.title, approverName: `${approver.firstName} ${approver.lastName}` },
    });
    if (requestedBy) {
      await notificationEngine.send({
        tenantId, recipientId: requestedBy._id || requestedBy, recipientRole: 'department_user',
        type: 'hod_approved', title: 'Requisition Approved by HOD',
        message: `Your requisition ${procurement.referenceNumber} has been approved by HOD and forwarded to Dean.`,
        priority: 'low', severity: 'success', category: 'workflow',
        referenceType: 'procurement', referenceId: procurement._id,
        link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 2,
        channels: { inApp: true, email: false },
      });
    }
  },

  // ─── STAGE 3: Faculty Dean Approval ────────────────────────────
  async deanApproved(tenantId, procurement, approver) {
    const financeStaff = await findByRoles(tenantId, ['finance_officer', 'bursar']);
    const procOfficers = await findByRole(tenantId, 'procurement_officer');
    await notificationEngine.sendBulk(financeStaff, {
      tenantId, type: 'dean_approved',
      title: 'Approved Faculty Requisition — Awaiting Budgetary Verification',
      message: `Dean-approved requisition ${procurement.referenceNumber} needs budgetary verification.`,
      priority: 'normal', severity: 'info', category: 'financial',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/budget-lock`, workflowStage: 3,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, approverName: `${approver.firstName} ${approver.lastName}`, budgetCode: procurement.budgetCode, totalCost: procurement.totalEstimatedCost },
    });
    await notificationEngine.sendBulk(procOfficers, {
      tenantId, type: 'dean_approved',
      title: 'Incoming Requisition in Planning Queue',
      message: `Requisition ${procurement.referenceNumber} approved by Dean. Incoming to your planning queue.`,
      priority: 'low', severity: 'info', category: 'workflow',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 3,
      channels: { inApp: true, email: false },
    });
  },

  // ─── STAGE 4: Financial Verification & Budget Lock ─────────────
  async budgetLocked(tenantId, procurement, approver) {
    const procOfficers = await findByRole(tenantId, 'procurement_officer');
    await notificationEngine.sendBulk(procOfficers, {
      tenantId, type: 'budget_locked',
      title: 'Budget Verified and Locked — Ready for Bidding Document Preparation',
      message: `Requisition ${procurement.referenceNumber} funds locked. Begin SPD preparation.`,
      priority: 'high', severity: 'success', category: 'financial',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/tenders/new?procurement=${procurement._id}`, workflowStage: 4,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, budgetCode: procurement.budgetCode || procurement.dappReference, totalCost: procurement.totalEstimatedCost, approverName: `${approver.firstName} ${approver.lastName}` },
    });
    // Notify Dean & HOD
    const approvers = await findByRoles(tenantId, ['dean', 'department_head']);
    await notificationEngine.sendBulk(approvers, {
      tenantId, type: 'budget_locked',
      title: `Funds Locked for Requisition ${procurement.referenceNumber}`,
      message: `Budget lock confirmed for ${procurement.referenceNumber}.`,
      priority: 'low', severity: 'success', category: 'financial',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/procurements/${procurement._id}`, workflowStage: 4,
      channels: { inApp: true, email: false },
    });
  },

  // ─── STAGE 5: Bidding Document Approval ────────────────────────
  async tecReviewRequired(tenantId, tender) {
    const tecMembers = await findByRole(tenantId, 'tec_member');
    await notificationEngine.sendBulk(tecMembers, {
      tenantId, type: 'tec_review_required',
      title: 'Draft Bidding Documents Ready for Technical Review',
      message: `Bidding documents for tender ${tender.tenderNumber || tender.referenceNumber} are ready for TEC review.`,
      priority: 'normal', severity: 'info', category: 'tender',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/tenders/${tender._id}`, workflowStage: 5,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, procurementMethod: tender.procurementMethod, category: tender.category },
    });
  },

  // ─── STAGE 6: Tender Publication ───────────────────────────────
  async tenderPublished(tenantId, tender, qualifiedSuppliers = []) {
    if (qualifiedSuppliers.length > 0) {
      await notificationEngine.sendBulk(qualifiedSuppliers, {
        tenantId, type: 'tender_published',
        title: 'New Sourcing Opportunity Published by Uva Wellassa University',
        message: `A new tender matching your profile has been published: ${tender.title}`,
        priority: 'normal', severity: 'info', category: 'tender',
        referenceType: 'tender', referenceId: tender._id,
        link: `${CLIENT}/tenders/${tender._id}`, workflowStage: 6,
        channels: { inApp: true, email: true },
        metadata: { tenderNumber: tender.tenderNumber, title: tender.title, category: tender.category, procurementMethod: tender.procurementMethod, deadline: tender.bidSubmissionDeadline },
      });
    }
  },

  // ─── STAGE 7: Bid Submission ───────────────────────────────────
  async bidSubmitted(tenantId, bid, supplier, tender) {
    await notificationEngine.send({
      tenantId, recipientId: supplier._id, recipientEmail: supplier.email, recipientRole: 'supplier',
      type: 'bid_submission_confirmed', title: 'Bid Submission Confirmed',
      message: `Your bid for tender ${tender.tenderNumber} has been encrypted and locked.`,
      priority: 'normal', severity: 'success', category: 'tender',
      referenceType: 'bid', referenceId: bid._id,
      link: `${CLIENT}/bid-box`, workflowStage: 7,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, submissionHash: bid.submissionHash },
    });
    const procOfficers = await findByRole(tenantId, 'procurement_officer');
    await notificationEngine.sendBulk(procOfficers, {
      tenantId, type: 'bid_received',
      title: 'New Secure Bid Received',
      message: `A new bid has been encrypted and locked in the Digital Bid Box for ${tender.tenderNumber}.`,
      priority: 'low', severity: 'info', category: 'tender',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/bid-box`, workflowStage: 7,
      channels: { inApp: true, email: false },
    });
  },

  // ─── STAGE 8: Bid Opening ─────────────────────────────────────
  async bidOpeningComplete(tenantId, tender, totalBids) {
    const tecMembers = await findByRole(tenantId, 'tec_member');
    await notificationEngine.sendBulk(tecMembers, {
      tenantId, type: 'bid_opening_complete',
      title: 'Bid Opening Completed — Technical Evaluation Workspace Active',
      message: `Bid opening for ${tender.tenderNumber} is complete. ${totalBids} bids received.`,
      priority: 'high', severity: 'info', category: 'tender',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/evaluation`, workflowStage: 8,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, totalBids, openingDate: new Date().toISOString() },
    });
  },

  // ─── STAGE 9: Evaluation Results ──────────────────────────────
  async evaluationComplete(tenantId, tender, qualifiedBidders, disqualifiedBidders) {
    for (const bidder of qualifiedBidders) {
      await notificationEngine.send({
        tenantId, recipientId: bidder._id, recipientEmail: bidder.email, recipientRole: 'supplier',
        type: 'technical_accepted', title: 'Technical Proposal Accepted — Financial Opening Scheduled',
        message: `Your technical proposal for ${tender.tenderNumber} has been accepted.`,
        priority: 'normal', severity: 'success', category: 'tender',
        referenceType: 'tender', referenceId: tender._id, workflowStage: 9,
        channels: { inApp: true, email: true },
        metadata: { tenderNumber: tender.tenderNumber },
      });
    }
    for (const bidder of disqualifiedBidders) {
      await notificationEngine.send({
        tenantId, recipientId: bidder._id, recipientEmail: bidder.email, recipientRole: 'supplier',
        type: 'technical_rejected', title: 'Technical Proposal Non-Responsive',
        message: `Your technical proposal for ${tender.tenderNumber} did not meet the threshold. Financial bid returned unopened.`,
        priority: 'normal', severity: 'warning', category: 'tender',
        referenceType: 'tender', referenceId: tender._id, workflowStage: 9,
        channels: { inApp: true, email: true },
        metadata: { tenderNumber: tender.tenderNumber },
      });
    }
  },

  // ─── STAGE 10: Award & Standstill ─────────────────────────────
  async intentionToAward(tenantId, tender, allBidders, standstillEndDate) {
    await notificationEngine.sendBulk(allBidders, {
      tenantId, type: 'intention_to_award',
      title: 'Intention to Award — Standstill Period Notice',
      message: `Formal intention to award for tender ${tender.tenderNumber}. Standstill period ends ${standstillEndDate}.`,
      priority: 'urgent', severity: 'warning', category: 'tender',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/awards`, workflowStage: 10,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, standstillEndDate, standstillDays: env.STANDSTILL_PERIOD_DAYS },
    });
  },

  // ─── STAGE 11: Debriefing & Appeal ─────────────────────────────
  async debriefingRequested(tenantId, tender, bidder) {
    const procOfficers = await findByRole(tenantId, 'procurement_officer');
    await notificationEngine.sendBulk(procOfficers, {
      tenantId, type: 'debriefing_requested',
      title: 'Debriefing Requested — Action Required Within 3 Working Days',
      message: `${bidder.firstName} ${bidder.lastName} has requested a debriefing for ${tender.tenderNumber}.`,
      priority: 'urgent', severity: 'warning', category: 'compliance',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/awards`, workflowStage: 11,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, bidderName: `${bidder.firstName} ${bidder.lastName}`, requestDate: new Date().toISOString() },
    });
  },

  async appealFiled(tenantId, tender, bidder) {
    const executives = await findByRoles(tenantId, ['vc', 'super_admin']);
    await notificationEngine.sendBulk(executives, {
      tenantId, type: 'appeal_filed',
      title: 'Formal Appeal Filed — Contract Execution Locked',
      message: `A formal appeal has been filed for tender ${tender.tenderNumber}. Contract execution is locked pending PAC review.`,
      priority: 'urgent', severity: 'error', category: 'compliance',
      referenceType: 'tender', referenceId: tender._id,
      link: `${CLIENT}/awards`, workflowStage: 11,
      channels: { inApp: true, email: true },
      metadata: { tenderNumber: tender.tenderNumber, bidderName: `${bidder.firstName} ${bidder.lastName}`, filedDate: new Date().toISOString() },
    });
  },

  // ─── STAGE 12: Contract Execution ──────────────────────────────
  async contractAwarded(tenantId, contract, supplier) {
    await notificationEngine.send({
      tenantId, recipientId: supplier._id, recipientEmail: supplier.email, recipientRole: 'supplier',
      type: 'contract_awarded', title: 'Contract Awarded — Upload Performance Security',
      message: `You have been awarded contract ${contract.contractNumber}. Upload Performance Security within 14 days.`,
      priority: 'urgent', severity: 'success', category: 'contract',
      referenceType: 'contract', referenceId: contract._id,
      link: `${CLIENT}/contracts/${contract._id}`, workflowStage: 12,
      channels: { inApp: true, email: true },
      metadata: { contractNumber: contract.contractNumber, tenderNumber: contract.tenderNumber, contractValue: contract.totalValue },
    });
    const storeManagers = await findByRole(tenantId, 'store_manager');
    await notificationEngine.sendBulk(storeManagers, {
      tenantId, type: 'contract_active',
      title: 'Contract Active — Delivery Expected at UWU Stores',
      message: `Contract ${contract.contractNumber} is active. Delivery expected.`,
      priority: 'normal', severity: 'info', category: 'contract',
      referenceType: 'contract', referenceId: contract._id,
      link: `${CLIENT}/delivery`, workflowStage: 12,
      channels: { inApp: true, email: false },
      metadata: { contractNumber: contract.contractNumber, supplierName: `${supplier.firstName} ${supplier.lastName}`, deliveryDate: contract.deliveryDate },
    });
  },

  // ─── STAGE 13: Delivery & 3-Way Match ─────────────────────────
  async threeWayMatchReconciled(tenantId, matchData) {
    const bursars = await findByRole(tenantId, 'bursar');
    await notificationEngine.sendBulk(bursars, {
      tenantId, type: 'three_way_match',
      title: `3-Way Match Reconciled for ${matchData.poNumber}`,
      message: `PO, GRN, and Invoice matched for ${matchData.poNumber}. Ready for payment release.`,
      priority: 'high', severity: 'success', category: 'financial',
      referenceType: 'payment', referenceId: matchData.paymentId,
      link: `${CLIENT}/payments`, workflowStage: 13,
      channels: { inApp: true, email: true },
      metadata: matchData,
    });
  },

  async goodsAccepted(tenantId, contract, supplier) {
    await notificationEngine.send({
      tenantId, recipientId: supplier._id, recipientEmail: supplier.email, recipientRole: 'supplier',
      type: 'goods_accepted', title: 'Goods Accepted — Payment Voucher Initialized',
      message: `Your delivered goods have been accepted. Payment processing has begun.`,
      priority: 'normal', severity: 'success', category: 'contract',
      referenceType: 'contract', referenceId: contract._id, workflowStage: 13,
      channels: { inApp: true, email: true },
      metadata: { poNumber: contract.poNumber, grnNumber: contract.grnNumber },
    });
  },

  // ─── SLA ESCALATION ────────────────────────────────────────────
  async slaWarning(tenantId, procurement, assignee, hoursElapsed) {
    await notificationEngine.send({
      tenantId, recipientId: assignee._id, recipientEmail: assignee.email, recipientRole: assignee.role,
      type: 'sla_warning', title: 'Pending Task Reminder',
      message: `Approval for ${procurement.referenceNumber} has been pending for ${hoursElapsed} hours.`,
      priority: 'high', severity: 'warning', category: 'compliance',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/approvals`, workflowStage: procurement.currentStage,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, stage: procurement.status, assigneeName: `${assignee.firstName} ${assignee.lastName}`, hoursElapsed },
    });
  },

  async slaEscalation(tenantId, procurement, originalAssignee, escalateTo) {
    await notificationEngine.send({
      tenantId, recipientId: escalateTo._id, recipientEmail: escalateTo.email, recipientRole: escalateTo.role,
      type: 'sla_escalation', title: 'SLA Escalation — Approval Overdue',
      message: `${procurement.referenceNumber} escalated due to ${env.SLA_ESCALATION_HOURS}h inaction.`,
      priority: 'urgent', severity: 'error', category: 'compliance',
      referenceType: 'procurement', referenceId: procurement._id,
      link: `${CLIENT}/approvals`, workflowStage: procurement.currentStage,
      channels: { inApp: true, email: true },
      metadata: { referenceNumber: procurement.referenceNumber, stage: procurement.status, assigneeName: `${originalAssignee.firstName} ${originalAssignee.lastName}`, escalatedTo: `${escalateTo.firstName} ${escalateTo.lastName}`, hoursElapsed: env.SLA_ESCALATION_HOURS },
    });
  },
};

module.exports = triggers;
