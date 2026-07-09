
const Procurement = require('../models/procurement.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const aiService = require('./ai.service');
const budgetValidationService = require('./budget.validation.service');
const { detectProcessAnomalies } = require('../ai/risk.analysis');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');
const { isCrossTenantRole } = require('../../../../packages/types/rbac.config');

class ProcurementService {
  async create(data, userId, tenantId) {
    const requestor = await User.findById(userId).select('department faculty');
    const createData = { ...data, requestedBy: userId, tenantId, status: 'draft' };
    if (requestor) {
      if (requestor.department) createData.department = requestor.department;
      if (requestor.faculty) createData.faculty = requestor.faculty;
    }
    
    const procurement = await Procurement.create(createData);
    logger.audit('PROCUREMENT_CREATED', userId, { procurementId: procurement._id, ref: procurement.referenceNumber });
    return procurement;
  }

  async getAll(query, tenantId, userContext = {}) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };

    // ─── Role-aware data scoping ─────────────────────────────
    const { role, userId, faculty, department } = userContext;
    if (role && !isCrossTenantRole(role)) {
      switch (role) {
        case 'department_user':
          // Department users see only their own requisitions
          filters.requestedBy = userId;
          break;
        case 'department_head':
          // HODs see requisitions from their department (regex to handle name format differences)
          if (department) {
            const escaped = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filters.department = { $regex: escaped, $options: 'i' };
          }
          break;
        case 'dean':
          // Deans see requisitions from their faculty or department (regex to handle name format differences)
          if (faculty) {
            const escaped = faculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filters.$or = [
              { faculty: { $regex: escaped, $options: 'i' } },
              { department: { $regex: escaped, $options: 'i' } }
            ];
          }
          break;
        case 'store_manager':
          // Store managers see delivery-phase items
          filters.status = { $in: ['delivery_pending', 'grn_pending', 'three_way_match', 'completed'] };
          break;
        case 'tec_member':
          // TEC members see items in evaluation phase
          filters.status = { $in: ['tender_preparation', 'published', 'bidding', 'evaluation', 'technical_evaluation', 'financial_evaluation'] };
          break;
        case 'contract_manager':
          // Contract managers see items from contract phase onward
          filters.status = { $in: ['contract_award', 'contract_signing', 'delivery_pending', 'grn_pending', 'three_way_match', 'completed'] };
          break;
        case 'finance_officer':
          // Finance officers see items needing budget/payment action
          if (faculty) {
            const escaped = faculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filters.faculty = { $regex: escaped, $options: 'i' };
          }
          break;
        // supplier should never reach here (no access to this route)
        default:
          break;
      }
    }

    if (query.status) {
      if (query.status === 'pending-approval') {
        filters.status = { $in: ['submitted', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'pmd_review'] };
      } else if (query.status === 'budget-locked') {
        filters.status = 'budget_locked';
      } else if (query.status === 'tendering') {
        filters.status = { $in: ['tender_preparation', 'published', 'bidding', 'evaluation'] };
      } else {
        filters.status = query.status;
      }
    }
    if (query.category) filters.category = query.category;
    if (query.department && !filters.department) filters.department = query.department;
    if (query.requestedBy) filters.requestedBy = query.requestedBy;
    if (query.search) filters.$or = [{ title: { $regex: query.search, $options: 'i' } }, { referenceNumber: { $regex: query.search, $options: 'i' } }];

    const [data, total] = await Promise.all([
      Procurement.find(filters).populate('requestedBy', 'firstName lastName email role department').sort(sort).skip(skip).limit(limit),
      Procurement.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async getById(id, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId })
      .populate('requestedBy', 'firstName lastName email role department')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .populate('tenderId').populate('contractId');
    if (!procurement) throw Object.assign(new Error('Procurement not found'), { statusCode: 404 });
    return procurement;
  }

  async update(id, data, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Procurement not found'), { statusCode: 404 });
    if (!['draft', 'rejected'].includes(procurement.status)) throw Object.assign(new Error('Cannot edit after submission'), { statusCode: 400 });
    
    Object.assign(procurement, data);
    procurement.revisionHistory.push({ version: procurement.version, changedBy: userId, changedAt: new Date(), changes: 'Updated' });
    procurement.version += 1;
    await procurement.save();
    return procurement;
  }

  async submit(id, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!['draft', 'rejected'].includes(procurement.status)) throw Object.assign(new Error('Can only submit drafts or rejected requisitions'), { statusCode: 400 });

    // Ensure department/faculty from the requestor's profile is on the procurement
    const requestor = await User.findById(userId).select('department faculty');
    if (requestor) {
      if (requestor.department) procurement.department = requestor.department;
      if (requestor.faculty) procurement.faculty = requestor.faculty;
    }

    // ── Budget Compliance Check (Step 27 enforcement) ──────────────────────────
    // 1. Item must exist in an approved Annual Plan (distribution_complete)
    // 2. Department must have sufficient remaining budget
    const complianceResult = await budgetValidationService.checkCompliance({
      annualPlanId: procurement.annualPlanId,
      annualPlanItemId: procurement.annualPlanItemId,
      department: procurement.department,
      faculty: procurement.faculty,
      totalEstimatedCost: procurement.totalEstimatedCost,
      budgetYear: procurement.budgetYear,
      tenantId,
    });

    // Store the compliance check result on the procurement document
    procurement.budgetComplianceCheck = {
      checkedAt: new Date(),
      ...complianceResult,
    };

    if (!complianceResult.passed) {
      if (complianceResult.requiresSpecialApproval) {
        // Within 10% grace — flag for special approval, still route through workflow
        procurement.status = 'flagged_special_approval';
        procurement.submittedAt = new Date();

        // Set up a minimal approval chain (HOD must still review)
        procurement.approvalChain = [{ stage: 'hod', status: 'pending' }];
        await procurement.save();

        // Notify requester of special approval flag
        try {
          await Notification.create({
            tenantId, recipient: userId, type: 'requisition_submitted',
            title: 'Requisition Flagged — Special Budget Approval Required',
            message: `Your requisition ${procurement.referenceNumber} exceeds the department budget by ${complianceResult.overBudgetPercent}% (within the 10% grace threshold). It has been flagged for special HOD approval.`,
            referenceType: 'procurement', referenceId: procurement._id,
            link: `/procurements/${procurement._id}`,
          });
        } catch (err) { logger.warn('Special approval notification failed', { error: err.message }); }

        logger.audit('PROCUREMENT_FLAGGED_SPECIAL_APPROVAL', userId, {
          procurementId: procurement._id,
          ref: procurement.referenceNumber,
          overBudgetPercent: complianceResult.overBudgetPercent,
        });
        return procurement;
      }

      // Hard fail — budget compliance not met
      const reasonMessages = {
        no_annual_plan_linked: 'This requisition is not linked to an approved Annual Procurement Plan (DAPP). Please link a DAPP item before submitting.',
        plan_not_approved: `The linked Annual Plan has not completed the budget distribution process (current status: ${complianceResult.annualPlanStatus || 'unknown'}). Budget must be fully distributed before initiating procurement.`,
        item_not_found: 'The selected DAPP item was not found in the linked Annual Plan. Please re-select a valid plan item.',
        insufficient_budget: `Insufficient department budget. Required: LKR ${(complianceResult.requiredBudget || 0).toLocaleString()}, Available: LKR ${(complianceResult.remainingBudget || 0).toLocaleString()}. The request exceeds the 10% grace threshold and cannot proceed.`,
        no_budget_allocated: 'No budget has been allocated to your department for this year. Please contact the Finance Division.',
      };
      const message = reasonMessages[complianceResult.failureReason] || 'Budget compliance check failed.';

      // Mark the procurement as rejected due to budget non-compliance
      procurement.status = 'rejected';
      procurement.approvalChain = [{
        stage: 'hod',
        status: 'rejected',
        comments: `[System Auto-Reject] ${message}`,
        actionDate: new Date(),
      }];
      await procurement.save();

      // Notify the requester
      try {
        await Notification.create({
          tenantId, recipient: userId, type: 'requisition_rejected',
          title: 'Requisition Rejected — Budget Compliance Failure',
          message: `Requisition ${procurement.referenceNumber} was automatically rejected: ${message}`,
          referenceType: 'procurement', referenceId: procurement._id,
          link: `/procurements/${procurement._id}`,
        });
      } catch (err) { logger.warn('Budget rejection notification failed', { error: err.message }); }

      logger.audit('PROCUREMENT_BUDGET_REJECTED', userId, {
        procurementId: procurement._id,
        ref: procurement.referenceNumber,
        reason: complianceResult.failureReason,
      });

      throw Object.assign(new Error(message), { statusCode: 422, complianceResult });
    }
    // ── End Budget Compliance Check ────────────────────────────────────────────

    // AI Budget Guard check
    try {
      const analysis = await aiService.analyzeSpecification(JSON.stringify({ title: procurement.title, items: procurement.items, category: procurement.category, total: procurement.totalEstimatedCost }));
      procurement.aiAnalysis = { ...procurement.aiAnalysis, specificationSummary: analysis.raw || JSON.stringify(analysis), recommendedMethod: analysis.recommendedMethod, budgetGuardResult: { passed: true, message: 'Budget validation passed', analyzedAt: new Date() } };
    } catch (err) {
      logger.warn('AI analysis failed during submit', { error: err.message });
      procurement.aiAnalysis = { ...procurement.aiAnalysis, budgetGuardResult: { passed: true, message: 'AI analysis unavailable, manual review required', analyzedAt: new Date() } };
    }

    // Detect anomalies
    const anomalies = detectProcessAnomalies(procurement);
    if (anomalies.length > 0) procurement.aiAnalysis.anomalyFlags = anomalies;

    procurement.status = 'submitted';
    procurement.submittedAt = new Date();
    procurement.currentStage = 3; // Stage 3 = Multi-Level Approval
    
    // Set up approval chain (reset for re-submissions)
    const newApprovalChain = [
      { stage: 'hod', status: 'pending' }
    ];
    
    // Only add Dean stage if the requestor belongs to an academic faculty
    if (procurement.faculty) {
      newApprovalChain.push({ stage: 'dean', status: 'pending' });
    }

    newApprovalChain.push({ stage: 'pmd', status: 'pending' });
    
    // Add higher-level approvals based on Phase 5 value thresholds
    const tce = procurement.totalEstimatedCost || 0;
    if (tce > 200000) {
      newApprovalChain.push({ stage: 'bursar', status: 'pending' });
    }
    if (tce > 500000) {
      newApprovalChain.push(
        { stage: 'finance_committee', status: 'pending' },
        { stage: 'vice_chancellor', status: 'pending' }
      );
    }
    
    procurement.approvalChain = newApprovalChain;
    
    await procurement.save();

    const chainNames = newApprovalChain.map(s => {
      if (s.stage === 'hod') return 'HOD';
      if (s.stage === 'dean') return 'Dean';
      if (s.stage === 'pmd') return 'PMD';
      if (s.stage === 'bursar') return 'Bursar';
      if (s.stage === 'finance_committee') return 'Finance Committee';
      if (s.stage === 'vice_chancellor') return 'VC';
      return s.stage.toUpperCase();
    }).join(' → ');

    // Notify the requester that their requisition was submitted
    try {
      await Notification.create({
        tenantId, recipient: userId, type: 'requisition_submitted',
        title: 'Requisition Submitted',
        message: `Your requisition ${procurement.referenceNumber} has been submitted and is awaiting HOD approval (${chainNames}).`,
        referenceType: 'procurement', referenceId: procurement._id,
        link: `/procurements/${procurement._id}`,
      });
    } catch (err) { logger.warn('Notification to requester failed', { error: err.message }); }

    // Notify all HODs in the same department that a new requisition needs approval
    try {
      const deptFilter = { tenantId, role: 'department_head', isActive: true };
      if (procurement.department) {
        const escaped = procurement.department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        deptFilter.department = { $regex: escaped, $options: 'i' };
      }
      const hods = await User.find(deptFilter).select('_id');
      for (const hod of hods) {
        await Notification.create({
          tenantId, recipient: hod._id, type: 'approval_required',
          title: 'New Requisition Awaiting Your Approval',
          message: `Requisition ${procurement.referenceNumber} ("${procurement.title}") has been submitted and requires HOD approval.`,
          referenceType: 'procurement', referenceId: procurement._id,
          link: `/approvals`,
        });
      }
    } catch (err) { logger.warn('HOD notification failed', { error: err.message }); }
    
    logger.audit('PROCUREMENT_SUBMITTED', userId, { procurementId: procurement._id, ref: procurement.referenceNumber });
    return procurement;
  }

  async approve(id, userId, userRole, stage, comments, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId })
      .populate('approvalChain.approver', 'firstName lastName email role');
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    // Validate that the approving role matches the expected approver for this stage
    const stageToRole = {
      hod: ['department_head', 'admin', 'super_admin'],
      dean: ['dean', 'admin', 'super_admin'],
      pmd: ['procurement_officer', 'admin', 'super_admin'],
      bursar: ['bursar', 'admin', 'super_admin'],
      finance_committee: ['finance_committee', 'finance_officer', 'admin', 'super_admin'],
      vice_chancellor: ['vc', 'admin', 'super_admin'],
    };
    const allowedRoles = stageToRole[stage] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      throw Object.assign(new Error(`Role '${userRole}' cannot approve at the '${stage}' stage.`), { statusCode: 403 });
    }

    // Enforce sequential approval order — only allow approving the NEXT pending stage
    const approvalOrder = ['hod', 'dean', 'pmd', 'bursar', 'finance_committee', 'vice_chancellor'];
    const currentStageIndex = approvalOrder.indexOf(stage);
    if (currentStageIndex > 0) {
      const previousStages = approvalOrder.slice(0, currentStageIndex);
      for (const prevStage of previousStages) {
        const prevEntry = procurement.approvalChain.find(s => s.stage === prevStage);
        if (prevEntry && prevEntry.status !== 'approved') {
          throw Object.assign(new Error(`Cannot approve '${stage}' — previous stage '${prevStage}' has not been approved yet.`), { statusCode: 400 });
        }
      }
    }

    const stageEntry = procurement.approvalChain.find(s => s.stage === stage && s.status === 'pending');
    if (!stageEntry) throw Object.assign(new Error(`No pending ${stage} approval`), { statusCode: 400 });

    stageEntry.approver = userId;
    stageEntry.status = 'approved';
    stageEntry.comments = comments;
    stageEntry.actionDate = new Date();

    // Check if ALL approval stages are now complete
    const allApproved = procurement.approvalChain.every(s => s.status === 'approved');

    if (allApproved) {
      // All approvals done — advance to budget lock phase
      procurement.status = 'pmd_review'; // Ready for budget validation
      procurement.currentStage = 4; // Stage 4 = Financial Validation & Budget Lock

      const chainNames = procurement.approvalChain.map(s => {
        if (s.stage === 'hod') return 'HOD';
        if (s.stage === 'dean') return 'Dean';
        if (s.stage === 'pmd') return 'PMD';
        if (s.stage === 'bursar') return 'Bursar';
        if (s.stage === 'finance_committee') return 'Finance Committee';
        if (s.stage === 'vice_chancellor') return 'VC';
        return s.stage.toUpperCase();
      }).join(' → ');

      // Notify finance/bursar that this is ready for budget lock
      try {
        await Notification.create({
          tenantId, recipient: procurement.requestedBy, type: 'approval_complete',
          title: 'All Approvals Complete',
          message: `Requisition ${procurement.referenceNumber} has been fully approved (${chainNames}). It is now ready for Budget Lock.`,
          referenceType: 'procurement', referenceId: procurement._id,
          link: `/procurements/${procurement._id}`,
        });
      } catch (err) { logger.warn('Notification failed', { error: err.message }); }
    } else {
      // Progress status based on completed stage
      const stageMap = { hod: 'hod_approved', dean: 'dean_approved', pmd: 'pmd_approved', bursar: 'bursar_approved', finance_committee: 'finance_committee_approved' };
      procurement.status = stageMap[stage] || procurement.status;
      procurement.currentStage = 3; // Still in approval phase

      // Find the next pending stage and notify
      const nextPending = procurement.approvalChain.find(s => s.status === 'pending');
      if (nextPending) {
        const nextStageLabel = nextPending.stage === 'hod' ? 'HOD' : nextPending.stage === 'dean' ? 'Dean' : nextPending.stage === 'pmd' ? 'Procurement Officer (PMD)' : nextPending.stage === 'bursar' ? 'Bursar' : nextPending.stage === 'finance_committee' ? 'Finance Committee' : nextPending.stage === 'vice_chancellor' ? 'Vice Chancellor' : nextPending.stage;
        
        // Notify the requester about progress
        try {
          await Notification.create({
            tenantId, recipient: procurement.requestedBy, type: 'approval_advanced',
            title: `Approved by ${stage.toUpperCase()} — Now Awaiting ${nextStageLabel}`,
            message: `Requisition ${procurement.referenceNumber} has been approved at the ${stage.toUpperCase()} stage and is now awaiting ${nextStageLabel} approval.`,
            referenceType: 'procurement', referenceId: procurement._id,
            link: `/procurements/${procurement._id}`,
          });
        } catch (err) { logger.warn('Notification failed', { error: err.message }); }

        // Notify the next-stage approvers
        try {
          const nextStageRoleMap = { hod: 'department_head', dean: 'dean', pmd: 'procurement_officer', bursar: 'bursar', finance_committee: 'finance_committee', vice_chancellor: 'vc' };
          const nextRole = nextStageRoleMap[nextPending.stage];
          if (nextRole) {
            const approverFilter = { tenantId, role: nextRole, isActive: true };
            if (nextRole === 'finance_committee') {
              approverFilter.role = { $in: ['finance_committee', 'finance_officer'] };
            }
            // Scope to same faculty for dean, same department for HOD
            if (nextRole === 'dean') {
              const targetFaculty = procurement.faculty || procurement.department;
              if (targetFaculty) {
                const escaped = targetFaculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                approverFilter.faculty = { $regex: escaped, $options: 'i' };
              }
            }
            const nextApprovers = await User.find(approverFilter).select('_id');
            for (const approver of nextApprovers) {
              await Notification.create({
                tenantId, recipient: approver._id, type: 'approval_required',
                title: `Requisition Awaiting Your ${nextStageLabel} Approval`,
                message: `Requisition ${procurement.referenceNumber} ("${procurement.title}") has passed ${stage.toUpperCase()} approval and now requires ${nextStageLabel} approval.`,
                referenceType: 'procurement', referenceId: procurement._id,
                link: `/approvals`,
              });
            }
          }
        } catch (err) { logger.warn('Next-stage notification failed', { error: err.message }); }
      }
    }
    
    await procurement.save();

    // Re-populate for response
    await procurement.populate('approvalChain.approver', 'firstName lastName email role');
    await procurement.populate('requestedBy', 'firstName lastName email role department');

    logger.audit('PROCUREMENT_APPROVED', userId, { stage, role: userRole, procurementId: procurement._id, allApproved });
    return procurement;
  }

  async reject(id, userId, userRole, stage, comments, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId })
      .populate('approvalChain.approver', 'firstName lastName email role');
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    // Validate that the rejecting role matches the expected approver for this stage
    const stageToRole = {
      hod: ['department_head', 'admin', 'super_admin'],
      dean: ['dean', 'admin', 'super_admin'],
      pmd: ['procurement_officer', 'admin', 'super_admin'],
      bursar: ['bursar', 'admin', 'super_admin'],
      finance_committee: ['finance_committee', 'finance_officer', 'admin', 'super_admin'],
      vice_chancellor: ['vc', 'admin', 'super_admin'],
    };
    const allowedRoles = stageToRole[stage] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      throw Object.assign(new Error(`Role '${userRole}' cannot reject at the '${stage}' stage.`), { statusCode: 403 });
    }

    const stageEntry = procurement.approvalChain.find(s => s.stage === stage && s.status === 'pending');
    if (!stageEntry) throw Object.assign(new Error(`No pending ${stage} rejection`), { statusCode: 400 });

    stageEntry.approver = userId;
    stageEntry.status = 'rejected';
    stageEntry.comments = comments;
    stageEntry.actionDate = new Date();
    
    // Set overall status to rejected — requisitioner can edit and re-submit
    procurement.status = 'rejected';
    procurement.currentStage = 2; // Back to requisition phase
    
    await procurement.save();

    // Notify the requester that their requisition was rejected
    try {
      const stageLabel = stage === 'hod' ? 'HOD' : stage === 'dean' ? 'Dean' : stage === 'pmd' ? 'Procurement Officer (PMD)' : stage === 'bursar' ? 'Bursar' : stage === 'finance_committee' ? 'Finance Committee' : stage === 'vice_chancellor' ? 'Vice Chancellor' : stage;
      await Notification.create({
        tenantId, recipient: procurement.requestedBy, type: 'requisition_rejected',
        title: `Requisition Returned by ${stageLabel}`,
        message: `Requisition ${procurement.referenceNumber} was returned by ${stageLabel}. Reason: ${comments || 'No reason provided'}. Please review and re-submit.`,
        referenceType: 'procurement', referenceId: procurement._id,
        link: `/procurements/${procurement._id}`,
      });
    } catch (err) { logger.warn('Notification failed', { error: err.message }); }

    // Re-populate for response
    await procurement.populate('approvalChain.approver', 'firstName lastName email role');
    await procurement.populate('requestedBy', 'firstName lastName email role department');

    logger.audit('PROCUREMENT_REJECTED', userId, { stage, role: userRole, procurementId: procurement._id });
    return procurement;
  }

  async lockBudget(id, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    procurement.budgetValidated = true;
    procurement.budgetLockedAt = new Date();
    procurement.status = 'budget_locked';
    procurement.currentStage = 4;
    await procurement.save();
    logger.audit('BUDGET_LOCKED', userId, { procurementId: procurement._id, amount: procurement.totalEstimatedCost });
    return procurement;
  }

  async getDashboardStats(tenantId, userContext = {}, queryParams = {}) {
    // Build base filter — scope by faculty/department for non-cross-tenant roles
    const baseFilter = { tenantId };
    const { role, userId, faculty } = userContext;
    if (role && !isCrossTenantRole(role)) {
      if (role === 'department_user') baseFilter.requestedBy = userId;
      else if (role === 'dean' && faculty) {
        const escaped = faculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        baseFilter.$or = [
          { faculty: { $regex: escaped, $options: 'i' } },
          { department: { $regex: escaped, $options: 'i' } }
        ];
      }
      else if (role === 'department_head' && userContext.department) {
        const escaped = userContext.department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        baseFilter.department = { $regex: escaped, $options: 'i' };
      }
    }

    // ── Category filter ─────────────────────────────────────────────────
    const { category, timeRange } = queryParams;
    if (category && category !== 'all') {
      baseFilter.category = { $regex: `^${category}$`, $options: 'i' };
    }

    // ── Time range filter ───────────────────────────────────────────────
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter': {
          const qMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), qMonth, 1);
          break;
        }
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          break;
      }
      if (startDate) {
        baseFilter.createdAt = { $gte: startDate };
      }
    }

    const [total, active, pending, completed, byCategory, byStatus, byDepartment, recentItems, totalSpendAgg] = await Promise.all([
      Procurement.countDocuments(baseFilter),
      Procurement.countDocuments({ ...baseFilter, status: { $nin: ['completed', 'cancelled', 'rejected', 'draft'] } }),
      Procurement.countDocuments({ ...baseFilter, status: { $in: ['submitted', 'under_review', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'pmd_review'] } }),
      Procurement.countDocuments({ ...baseFilter, status: 'completed' }),
      Procurement.aggregate([{ $match: baseFilter }, { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$totalEstimatedCost' } } }]),
      Procurement.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Procurement.aggregate([{ $match: baseFilter }, { $group: { _id: '$department', count: { $sum: 1 }, totalValue: { $sum: '$totalEstimatedCost' } } }]),
      Procurement.find(baseFilter).sort('-createdAt').limit(10).populate('requestedBy', 'firstName lastName'),
      Procurement.aggregate([{ $match: baseFilter }, { $group: { _id: null, totalSpend: { $sum: '$totalEstimatedCost' } } }]),
    ]);
    const totalSpend = totalSpendAgg.length > 0 ? totalSpendAgg[0].totalSpend : 0;
    return { total, active, pending, completed, totalSpend, byCategory, byStatus, byDepartment, recentItems };
  }

  async getMyPendingApprovals(userId, role, tenantId, userContext = {}) {
    // Map user role to the approval chain stage they can act on
    const roleToStage = {
      department_head: 'hod',
      dean: 'dean',
      bursar: 'bursar',
      finance_committee: 'finance_committee',
      finance_officer: 'finance_committee',
      procurement_officer: 'pmd',
      vc: 'vice_chancellor',
    };
    const targetStage = roleToStage[role];

    // Admin and super_admin see ALL pending approvals across all stages
    if (role === 'admin' || role === 'super_admin') {
      return Procurement.find({
        tenantId,
        status: { $in: ['submitted', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved'] },
        'approvalChain.status': 'pending',
      })
        .populate('requestedBy', 'firstName lastName email department')
        .populate('approvalChain.approver', 'firstName lastName email role')
        .sort('-createdAt');
    }

    if (!targetStage) {
      return []; // Role has no approval responsibilities
    }

    // Find procurements where this role's stage is pending AND all prior stages are approved
    // This ensures sequential order: HOD sees 'submitted', Dean sees 'hod_approved', PMD sees 'dean_approved'
    const approvalOrder = ['hod', 'dean', 'pmd', 'bursar', 'finance_committee', 'vice_chancellor'];
    const stageIndex = approvalOrder.indexOf(targetStage);
    const previousStages = approvalOrder.slice(0, stageIndex);

    // Build query: target stage must be pending
    const query = {
      tenantId,
      status: { $nin: ['draft', 'rejected', 'cancelled', 'completed'] },
      'approvalChain': {
        $elemMatch: { stage: targetStage, status: 'pending' }
      },
    };

    // Apply department/faculty scoping if applicable
    // Use regex matching to handle name format differences:
    //   User model stores "Medicine", procurement stores "Faculty of Medicine"
    const { department, faculty } = userContext;
    if (role === 'department_head' && department) {
      // Escape special regex chars and match anywhere in the string
      const escaped = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.department = { $regex: escaped, $options: 'i' };
    } else if (role === 'dean' && faculty) {
      const escaped = faculty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { faculty: { $regex: escaped, $options: 'i' } },
        { department: { $regex: escaped, $options: 'i' } }
      ];
    }

    const results = await Procurement.find(query)
      .populate('requestedBy', 'firstName lastName email department')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .sort('-createdAt');

    // Filter in-memory: ensure all previous stages are approved (sequential order)
    return results.filter(proc => {
      return previousStages.every(prevStage => {
        const entry = proc.approvalChain.find(a => a.stage === prevStage);
        return !entry || entry.status === 'approved'; // If stage doesn't exist, it's OK
      });
    });
  }

  async unlockBudget(id, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    procurement.budgetValidated = false;
    procurement.budgetLockedAt = null;
    procurement.status = 'pmd_review';
    procurement.currentStage = 3;
    await procurement.save();
    logger.audit('BUDGET_UNLOCKED', userId, { procurementId: procurement._id, amount: procurement.totalEstimatedCost });
    return procurement;
  }

  async getBudgetStatus(query, tenantId) {
    const filters = { tenantId, status: { $in: ['pmd_review', 'budget_locked', 'committee_assigned'] } };
    if (query.faculty) filters.faculty = query.faculty;
    const data = await Procurement.find(filters)
      .select('referenceNumber title faculty department totalEstimatedCost budgetValidated budgetLockedAt status budgetRemaining budgetAllocated')
      .populate('requestedBy', 'firstName lastName')
      .sort('-createdAt');
    return data;
  }

  async deleteProcurement(id, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (procurement.status !== 'draft') {
      throw Object.assign(new Error('Can only delete draft requisitions'), { statusCode: 400 });
    }
    await Procurement.deleteOne({ _id: id });
    logger.audit('PROCUREMENT_DELETED', userId, { procurementId: id });
    return { message: 'Requisition deleted' };
  }
  async publish(id, userId, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!['pmd_review', 'budget_locked'].includes(procurement.status)) {
      throw Object.assign(
        new Error('Procurement must be fully approved by Vice Chancellor before publishing to suppliers.'),
        { statusCode: 400 }
      );
    }

    // Double-check all approval chain entries are approved
    const allApproved = procurement.approvalChain.every(s => s.status === 'approved');
    if (!allApproved) {
      throw Object.assign(
        new Error('All approval stages must be completed before publishing.'),
        { statusCode: 400 }
      );
    }

    procurement.status = 'published';
    procurement.publishedAt = new Date();
    procurement.publishedBy = userId;
    procurement.currentStage = 6; // Stage 6 = Tendering / Published
    await procurement.save();

    // Notify the requester
    try {
      await Notification.create({
        tenantId, recipient: procurement.requestedBy, type: 'procurement_published',
        title: 'Procurement Published to Suppliers',
        message: `Requisition ${procurement.referenceNumber} ("${procurement.title}") has been published and is now visible to suppliers.`,
        referenceType: 'procurement', referenceId: procurement._id,
        link: `/procurements/${procurement._id}`,
      });
    } catch (err) { logger.warn('Publish notification failed', { error: err.message }); }

    logger.audit('PROCUREMENT_PUBLISHED', userId, { procurementId: procurement._id, ref: procurement.referenceNumber });
    return procurement;
  }

  /**
   * Standalone budget compliance check — called by HOD pre-check endpoint.
   * Returns the compliance result without modifying the procurement document.
   */
  async validateBudgetCompliance(id, tenantId) {
    const procurement = await Procurement.findOne({ _id: id, tenantId });
    if (!procurement) throw Object.assign(new Error('Procurement not found'), { statusCode: 404 });

    const result = await budgetValidationService.checkCompliance({
      annualPlanId: procurement.annualPlanId,
      annualPlanItemId: procurement.annualPlanItemId,
      department: procurement.department,
      faculty: procurement.faculty,
      totalEstimatedCost: procurement.totalEstimatedCost,
      budgetYear: procurement.budgetYear,
      tenantId,
    });

    return {
      procurementId: procurement._id,
      referenceNumber: procurement.referenceNumber,
      title: procurement.title,
      totalEstimatedCost: procurement.totalEstimatedCost,
      department: procurement.department,
      faculty: procurement.faculty,
      ...result,
    };
  }

  async getPublicProcurements(tenantId) {
    const publicStatuses = [
      'published', 'bidding', 'evaluation', 'technical_evaluation', 'financial_evaluation',
      'contract_award', 'contract_signing', 'in_progress', 'delivery_pending', 
      'grn_pending', 'three_way_match', 'completed'
    ];
    const data = await Procurement.find({ tenantId, status: { $in: publicStatuses } })
      .populate('tenderId')
      .sort('-createdAt')
      .limit(50);
    return data;
  }
}

module.exports = new ProcurementService();
