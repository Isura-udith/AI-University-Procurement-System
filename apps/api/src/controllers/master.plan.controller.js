/**
 * Master Procurement Plan Controller
 * Phase 1: 3-Year Strategic Procurement Planning
 */
const MasterPlan = require('../models/master.plan.model');
const { success, created, paginated } = require('../utils/response');

// Role → approval stage mapping
const ROLE_TO_STAGE = {
  dean: 'dean',
  bursar: 'bursar',
  finance_committee: 'finance_committee',
  finance_officer: 'finance_committee',
  vc: 'vice_chancellor',
  admin: 'council',
  super_admin: 'council',
};

// Status transitions on approval
const APPROVAL_TRANSITIONS = {
  dean: 'bursar_estimation',
  bursar: 'finance_committee_review',
  finance_committee: 'vc_review',
  vice_chancellor: 'council_review',
  council: 'active',
};

const STATUS_ON_SUBMIT = 'dean_review';

/** POST /api/master-plans — Create a new MPP */
const createMasterPlan = async (req, res, next) => {
  try {
    const plan = new MasterPlan({
      ...req.body,
      tenantId: req.tenantId,
      createdBy: req.user._id,
      department: req.user.department,
      faculty: req.user.faculty,
    });
    await plan.save();
    return created(res, plan, 'Master Procurement Plan created');
  } catch (err) { next(err); }
};

/** GET /api/master-plans — List all MPPs (scoped by role) */
const getMasterPlans = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, cycleStart } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (cycleStart) filter.cycleStart = Number(cycleStart);
    // HOD only sees their own; others see all
    if (req.user.role === 'department_head' || req.user.role === 'department_user') {
      filter.createdBy = req.user._id;
    }
    const [data, total] = await Promise.all([
      MasterPlan.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      MasterPlan.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

/** GET /api/master-plans/:id — Get single MPP */
const getMasterPlan = async (req, res, next) => {
  try {
    const plan = await MasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('createdBy', 'name email role')
      .populate('approvalChain.approver', 'name email role');
    if (!plan) return res.status(404).json({ message: 'Master Plan not found' });
    return success(res, plan);
  } catch (err) { next(err); }
};

/** PUT /api/master-plans/:id — Update draft MPP */
const updateMasterPlan = async (req, res, next) => {
  try {
    const plan = await MasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Master Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Only draft plans can be edited' });
    Object.assign(plan, req.body);
    await plan.save();
    return success(res, plan, 'Updated');
  } catch (err) { next(err); }
};

/** POST /api/master-plans/:id/submit — Submit MPP for Dean review */
const submitMasterPlan = async (req, res, next) => {
  try {
    const plan = await MasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Master Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Plan already submitted' });
    plan.status = STATUS_ON_SUBMIT;
    plan.submittedAt = new Date();
    plan.approvalChain.push({ stage: 'hod', approver: req.user._id, status: 'approved', actionDate: new Date(), comments: 'Submitted for review' });
    await plan.save();
    return success(res, plan, 'Submitted for Dean review');
  } catch (err) { next(err); }
};

/** POST /api/master-plans/:id/approve — Approve/reject MPP at current stage */
const approveMasterPlan = async (req, res, next) => {
  try {
    const plan = await MasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Master Plan not found' });

    const { action, comments, estimatedBudget } = req.body; // action: 'approve' | 'reject'
    const userRole = req.user.role;

    // Super admin: auto-detect current pending stage from plan status
    const STATUS_TO_STAGE = {
      dean_review: 'dean', bursar_estimation: 'bursar',
      finance_committee_review: 'finance_committee', vc_review: 'vice_chancellor',
      council_review: 'council',
    };
    const requiredStage = STATUS_TO_STAGE[plan.status];
    if (!requiredStage) {
      return res.status(400).json({ message: 'This plan is not pending any approval stage.' });
    }

    let stage;
    if (userRole === 'super_admin') {
      stage = requiredStage;
    } else {
      stage = ROLE_TO_STAGE[userRole];
      if (stage !== requiredStage) {
        return res.status(403).json({
          message: `Bypassing stages is not allowed. Awaiting approval from ${requiredStage.toUpperCase()}, but you are acting as ${stage ? stage.toUpperCase() : 'UNKNOWN'}.`
        });
      }
    }

    const stageEntry = {
      stage,
      approver: req.user._id,
      status: action === 'approve' ? 'approved' : 'rejected',
      comments,
      actionDate: new Date(),
    };
    if (estimatedBudget && stage === 'bursar') {
      stageEntry.estimatedBudget = estimatedBudget;
      plan.bursarEstimatedBudget = estimatedBudget;
    }

    plan.approvalChain.push(stageEntry);

    if (action === 'approve') {
      plan.status = APPROVAL_TRANSITIONS[stage] || 'active';
      if (plan.status === 'active') {
        plan.activatedAt = new Date();

        // ── Phase 1 → Phase 2 handoff: Auto-create annual plan stubs ──
        const AnnualPlan = require('../models/annual.plan.model');
        for (let yearNum = 1; yearNum <= 3; yearNum++) {
          const planYear = plan.cycleStart + yearNum - 1;
          // Check if annual plan already exists for this year
          const exists = await AnnualPlan.findOne({
            tenantId: plan.tenantId,
            masterPlanId: plan._id,
            cycleYearNumber: yearNum,
          });
          if (!exists) {
            const yearItems = plan.requirements
              .filter(r => r.plannedYear === yearNum)
              .map(r => ({
                masterPlanRequirementId: r._id,
                department: r.department,
                faculty: r.faculty,
                description: r.description,
                category: r.category,
                estimatedQuantity: r.estimatedQuantity,
                unit: r.unit,
                estimatedUnitCost: r.estimatedUnitCost,
                estimatedTotalCost: r.estimatedTotalCost,
                priority: r.priority,
              }));
            const annualPlan = new AnnualPlan({
              tenantId: plan.tenantId,
              masterPlanId: plan._id,
              masterPlanRef: plan.referenceNumber,
              planYear,
              cycleYearNumber: yearNum,
              title: `${plan.title} — Year ${yearNum} (${planYear})`,
              description: `Annual procurement plan derived from MPP: ${plan.referenceNumber}`,
              items: yearItems,
              createdBy: req.user._id,
            });
            await annualPlan.save();
            plan.annualPlanIds.push(annualPlan._id);
          }
        }
      }
    } else {
      plan.status = 'rejected';
    }

    await plan.save();
    return success(res, plan, action === 'approve' ? 'Approved' : 'Rejected');
  } catch (err) { next(err); }
};

/** GET /api/master-plans/pending — Get MPPs pending my approval */
const getPendingMasterPlans = async (req, res, next) => {
  try {
    const userRole = req.user.role;

    // Super admin sees ALL pending plans across all review stages
    if (userRole === 'super_admin') {
      const plans = await MasterPlan.find({
        tenantId: req.tenantId,
        status: { $in: ['dean_review', 'bursar_estimation', 'finance_committee_review', 'vc_review', 'council_review'] },
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      return success(res, plans);
    }

    const stageFilter = {
      dean: 'dean_review',
      bursar: 'bursar_estimation',
      finance_committee: 'finance_committee_review',
      finance_officer: 'finance_committee_review',
      vc: 'vc_review',
      admin: 'council_review',
    };
    const statusToFilter = stageFilter[userRole];
    if (!statusToFilter) return success(res, []);
    const plans = await MasterPlan.find({ tenantId: req.tenantId, status: statusToFilter })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return success(res, plans);
  } catch (err) { next(err); }
};

module.exports = {
  createMasterPlan,
  getMasterPlans,
  getMasterPlan,
  updateMasterPlan,
  submitMasterPlan,
  approveMasterPlan,
  getPendingMasterPlans,
};
