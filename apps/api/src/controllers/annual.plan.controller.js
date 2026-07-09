/**
 * Annual Procurement Plan Controller
 * Phase 2 & 3: Annual Planning + External Budget Approval Loop
 */
const AnnualPlan = require('../models/annual.plan.model');
const MasterPlan = require('../models/master.plan.model');
const { success, created, paginated } = require('../utils/response');

const INTERNAL_ROLE_TO_STAGE = {
  dean: 'dean',
  bursar: 'bursar',
  finance_committee: 'finance_committee',
  finance_officer: 'finance_committee',
  vc: 'vice_chancellor',
  admin: 'council',
  super_admin: 'council',
};

const INTERNAL_TRANSITIONS = {
  dean: 'bursar_review',
  bursar: 'finance_committee_review',
  finance_committee: 'vc_review',
  vice_chancellor: 'council_review',
  council: 'ugc_submitted',
};

/** POST /api/annual-plans — Create annual plan from MPP */
const createAnnualPlan = async (req, res, next) => {
  try {
    const { masterPlanId, planYear, cycleYearNumber, title, description, items } = req.body;
    const masterPlan = await MasterPlan.findOne({ _id: masterPlanId, tenantId: req.tenantId });
    if (!masterPlan) return res.status(404).json({ message: 'Master Plan not found' });
    if (!['active', 'council_approved'].includes(masterPlan.status)) {
      return res.status(400).json({ message: 'Master Plan must be approved/active to create an Annual Plan' });
    }

    const plan = new AnnualPlan({
      tenantId: req.tenantId,
      masterPlanId,
      masterPlanRef: masterPlan.referenceNumber,
      planYear,
      cycleYearNumber,
      title,
      description,
      items: items || [],
      createdBy: req.user._id,
    });
    await plan.save();

    // Link back to master plan
    masterPlan.annualPlanIds.push(plan._id);
    await masterPlan.save();

    return created(res, plan, 'Annual Procurement Plan created');
  } catch (err) { next(err); }
};

/** GET /api/annual-plans — List annual plans */
const getAnnualPlans = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, planYear, masterPlanId } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (planYear) filter.planYear = Number(planYear);
    if (masterPlanId) filter.masterPlanId = masterPlanId;

    const [data, total] = await Promise.all([
      AnnualPlan.find(filter)
        .populate('createdBy', 'name email')
        .populate('masterPlanId', 'title referenceNumber cycleStart cycleEnd')
        .sort({ planYear: -1 })
        .skip(skip).limit(Number(limit)),
      AnnualPlan.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

/** GET /api/annual-plans/:id — Get single annual plan */
const getAnnualPlan = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('createdBy', 'name email role')
      .populate('masterPlanId', 'title referenceNumber cycleStart cycleEnd')
      .populate('internalApprovals.approver', 'name email role')
      .populate('externalApprovals.recordedBy', 'name email');
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });
    return success(res, plan);
  } catch (err) { next(err); }
};

/** PUT /api/annual-plans/:id — Update draft annual plan */
const updateAnnualPlan = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Only draft plans can be edited' });
    Object.assign(plan, req.body);
    await plan.save();
    return success(res, plan, 'Updated');
  } catch (err) { next(err); }
};

/** POST /api/annual-plans/:id/submit — Submit to Dean */
const submitAnnualPlan = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Plan already submitted' });
    plan.status = 'dean_review';
    plan.submittedAt = new Date();
    await plan.save();
    return success(res, plan, 'Submitted for Dean review');
  } catch (err) { next(err); }
};

/** POST /api/annual-plans/:id/approve — Internal approval (Dean→Bursar→Finance→VC→Council) */
const approveAnnualPlan = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });

    const { action, comments } = req.body;

    // Super admin: auto-detect current pending stage from plan status
    const STATUS_TO_STAGE = {
      dean_review: 'dean', bursar_review: 'bursar',
      finance_committee_review: 'finance_committee', vc_review: 'vice_chancellor',
      council_review: 'council',
    };
    const requiredStage = STATUS_TO_STAGE[plan.status];
    if (!requiredStage) {
      return res.status(400).json({ message: 'This plan is not pending any internal approval stage.' });
    }

    let stage;
    if (req.user.role === 'super_admin') {
      stage = requiredStage;
    } else {
      stage = INTERNAL_ROLE_TO_STAGE[req.user.role];
      if (stage !== requiredStage) {
        return res.status(403).json({
          message: `Bypassing stages is not allowed. Awaiting approval from ${requiredStage.toUpperCase()}, but you are acting as ${stage ? stage.toUpperCase() : 'UNKNOWN'}.`
        });
      }
    }

    plan.internalApprovals.push({
      stage,
      approver: req.user._id,
      status: action === 'approve' ? 'approved' : 'rejected',
      comments,
      actionDate: new Date(),
    });

    if (action === 'approve') {
      plan.status = INTERNAL_TRANSITIONS[stage] || plan.status;
    } else {
      plan.status = 'rejected';
    }
    await plan.save();
    return success(res, plan, action === 'approve' ? 'Approved' : 'Rejected');
  } catch (err) { next(err); }
};

/** POST /api/annual-plans/:id/external-approval — Record external body status (UGC/Treasury/Parliament) */
const recordExternalApproval = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });

    const { body, status, referenceNumber, allocatedAmount, notes, submittedAt, approvedAt } = req.body;
    // Valid bodies: ugc, treasury, parliament
    const validBodies = ['ugc', 'treasury', 'parliament'];
    if (!validBodies.includes(body)) return res.status(400).json({ message: 'Invalid external body' });

    // Update or create external approval entry
    const existing = plan.externalApprovals.find(e => e.body === body);
    if (existing) {
      Object.assign(existing, { status, referenceNumber, allocatedAmount, notes, submittedAt, approvedAt, recordedBy: req.user._id, recordedAt: new Date() });
    } else {
      plan.externalApprovals.push({ body, status, referenceNumber, allocatedAmount, notes, submittedAt, approvedAt, recordedBy: req.user._id });
    }

    // Auto-advance status
    const statusMap = {
      ugc: { submitted: 'ugc_submitted', approved: 'ugc_approved' },
      treasury: { submitted: 'treasury_submitted', approved: 'treasury_approved' },
      parliament: { submitted: 'parliament_submitted', approved: 'parliament_approved' },
    };
    if (statusMap[body] && statusMap[body][status]) {
      plan.status = statusMap[body][status];
    }
    if (body === 'parliament' && status === 'approved') {
      plan.totalAllocatedBudget = allocatedAmount;
    }

    await plan.save();
    return success(res, plan, `${body.toUpperCase()} status updated`);
  } catch (err) { next(err); }
};

/** POST /api/annual-plans/:id/confirm-budget — Confirm university received budget (triggers Phase 4) */
const confirmBudgetReceived = async (req, res, next) => {
  try {
    const plan = await AnnualPlan.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('masterPlanId', 'requirements');
    if (!plan) return res.status(404).json({ message: 'Annual Plan not found' });
    if (!['parliament_approved'].includes(plan.status)) {
      return res.status(400).json({ message: 'Budget can only be confirmed after Parliament approval' });
    }
    plan.status = 'budget_received';
    plan.budgetConfirmed = true;
    plan.budgetConfirmedAt = new Date();
    plan.budgetConfirmedBy = req.user._id;
    if (req.body.finalAllocatedBudget) plan.totalAllocatedBudget = req.body.finalAllocatedBudget;

    // ── Phase 3 → Phase 4 handoff: Auto-create BudgetAllocation ──
    const BudgetAllocation = require('../models/budget.allocation.model');
    const existingAlloc = await BudgetAllocation.findOne({
      tenantId: req.tenantId,
      annualPlanId: plan._id,
      budgetYear: plan.planYear,
    });
    if (!existingAlloc) {
      // Group items by department/faculty to build department allocations
      const deptMap = {};
      for (const item of plan.items) {
        const key = `${item.faculty}::${item.department}`;
        if (!deptMap[key]) {
          deptMap[key] = { faculty: item.faculty, department: item.department, allocatedAmount: 0 };
        }
        deptMap[key].allocatedAmount += item.estimatedTotalCost || 0;
      }
      const departmentAllocations = Object.values(deptMap);

      const allocation = new BudgetAllocation({
        tenantId: req.tenantId,
        annualPlanId: plan._id,
        budgetYear: plan.planYear,
        totalUniversityBudget: plan.totalAllocatedBudget || plan.totalBudgetRequest,
        procurementBudget: plan.totalAllocatedBudget || plan.totalBudgetRequest,
        departmentAllocations,
        distributedBy: req.user._id,
        distributedAt: new Date(),
      });
      await allocation.save();
      plan.budgetAllocationIds.push(allocation._id);
    }

    await plan.save();
    return success(res, plan, 'Budget confirmed. Budget allocation created — proceed to distribution.');
  } catch (err) { next(err); }
};

/** GET /api/annual-plans/pending — Plans pending my approval */
const getPendingAnnualPlans = async (req, res, next) => {
  try {
    // Super admin sees ALL pending plans across all review stages
    if (req.user.role === 'super_admin') {
      const plans = await AnnualPlan.find({
        tenantId: req.tenantId,
        status: { $in: ['dean_review', 'bursar_review', 'finance_committee_review', 'vc_review', 'council_review'] },
      })
        .populate('createdBy', 'name email')
        .populate('masterPlanId', 'title referenceNumber')
        .sort({ createdAt: -1 });
      return success(res, plans);
    }

    const stageFilter = {
      dean: 'dean_review',
      bursar: 'bursar_review',
      finance_committee: 'finance_committee_review',
      finance_officer: 'finance_committee_review',
      vc: 'vc_review',
      admin: 'council_review',
    };
    const statusToFilter = stageFilter[req.user.role];
    if (!statusToFilter) return success(res, []);
    const plans = await AnnualPlan.find({ tenantId: req.tenantId, status: statusToFilter })
      .populate('createdBy', 'name email')
      .populate('masterPlanId', 'title referenceNumber')
      .sort({ createdAt: -1 });
    return success(res, plans);
  } catch (err) { next(err); }
};

module.exports = {
  createAnnualPlan, getAnnualPlans, getAnnualPlan, updateAnnualPlan,
  submitAnnualPlan, approveAnnualPlan, recordExternalApproval,
  confirmBudgetReceived, getPendingAnnualPlans,
};
