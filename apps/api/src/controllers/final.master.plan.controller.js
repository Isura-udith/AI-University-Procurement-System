/**
 * Final Master Plan Controller
 * Full CRUD + multi-stage approval workflow (HOD → Dean → Bursar → Finance Committee → VC → Council)
 * Only items from active/approved Final Master Plans can create Procurement Requests.
 */
const FinalMasterPlan = require('../models/final.master.plan.model');
const DraftProcurementItem = require('../models/draft.procurement.model');
const { success, created, paginated } = require('../utils/response');

// Role → approval stage mapping
const ROLE_TO_STAGE = {
  bursar: 'bursar',
  finance_committee: 'finance_committee',
  finance_officer: 'finance_committee',
  vc: 'vice_chancellor',
  council: 'council',
  council_member: 'council',
  admin: 'council',
  super_admin: 'council',
};

// Status transitions on approval
const APPROVAL_TRANSITIONS = {
  bursar: 'finance_committee_review',
  finance_committee: 'vc_review',
  vice_chancellor: 'council_review',
  council: 'active',
};

// Map plan status to required stage
const STATUS_TO_STAGE = {
  bursar_review: 'bursar',
  finance_committee_review: 'finance_committee',
  vc_review: 'vice_chancellor',
  council_review: 'council',
};

const STATUS_ON_SUBMIT = 'bursar_review';

/** POST /api/final-master-plans — Create a new Final Master Plan */
const createFinalMasterPlan = async (req, res, next) => {
  try {
    const plan = new FinalMasterPlan({
      ...req.body,
      tenantId: req.tenantId,
      createdBy: req.user._id,
      department: req.user.department,
      faculty: req.user.faculty,
    });
    await plan.save();
    return created(res, plan, 'Final Master Plan created');
  } catch (err) { next(err); }
};

/** GET /api/final-master-plans — List all Final Master Plans (scoped by role) */
const getFinalMasterPlans = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, planYear } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (planYear) filter.planYear = Number(planYear);

    // Department users see their own plans OR active/approved plans
    if (req.user.role === 'department_head' || req.user.role === 'department_user') {
      filter.$or = [
        { createdBy: req.user._id },
        { status: { $in: ['active', 'council_approved', 'parliament_approved', 'distribution_complete'] } }
      ];
    }
    // Deans see plans from their faculty
    if (req.user.role === 'dean' && req.user.faculty) {
      filter.faculty = { $regex: new RegExp(req.user.faculty.replace(/^Faculty of\s+/i, '').trim(), 'i') };
    }

    const [data, total] = await Promise.all([
      FinalMasterPlan.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      FinalMasterPlan.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

/** GET /api/final-master-plans/:id — Get single Final Master Plan */
const getFinalMasterPlan = async (req, res, next) => {
  try {
    const plan = await FinalMasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('createdBy', 'name email role')
      .populate('approvalChain.approver', 'name email role');
    if (!plan) return res.status(404).json({ message: 'Final Master Plan not found' });
    return success(res, plan);
  } catch (err) { next(err); }
};

/** PUT /api/final-master-plans/:id — Update draft Final Master Plan */
const updateFinalMasterPlan = async (req, res, next) => {
  try {
    const plan = await FinalMasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Final Master Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Only draft plans can be edited' });
    Object.assign(plan, req.body);
    await plan.save();
    return success(res, plan, 'Updated');
  } catch (err) { next(err); }
};

/** POST /api/final-master-plans/:id/add-items — Add approved draft items to the Final Master Plan */
const addItemsToFinalPlan = async (req, res, next) => {
  try {
    const plan = await FinalMasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Final Master Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Can only add items to draft plans' });

    const { draftItemIds } = req.body;
    if (!Array.isArray(draftItemIds) || draftItemIds.length === 0) {
      return res.status(400).json({ message: 'draftItemIds must be a non-empty array' });
    }

    // Fetch approved draft items
    const draftItems = await DraftProcurementItem.find({
      _id: { $in: draftItemIds },
      tenantId: req.tenantId,
      status: { $in: ['approved', 'dean_approved'] },
    });

    if (draftItems.length === 0) {
      return res.status(400).json({ message: 'No approved draft items found with the given IDs' });
    }

    // Map draft items to FMP item format
    const newItems = draftItems.map(d => ({
      draftItemId: d._id,
      description: d.description,
      department: d.department,
      faculty: d.faculty,
      category: d.category,
      dappNumber: d.itemCode,
      estimatedQuantity: d.estimatedQuantity,
      unit: d.unit,
      estimatedUnitCost: d.estimatedUnitCost,
      estimatedTotalCost: d.estimatedTotalCost,
      plannedYear: d.plannedYear,
      priority: d.priority,
      fundingSource: d.fundingSource,
      justification: d.justification,
    }));

    plan.items.push(...newItems);
    await plan.save();

    // Mark draft items as linked to final master plan
    await DraftProcurementItem.updateMany(
      { _id: { $in: draftItems.map(d => d._id) } },
      { $set: { masterPlanId: plan._id } }
    );

    return success(res, plan, `Added ${newItems.length} item(s) to Final Master Plan`);
  } catch (err) { next(err); }
};

/** POST /api/final-master-plans/:id/submit — Submit for Bursar review */
const submitFinalMasterPlan = async (req, res, next) => {
  try {
    const plan = await FinalMasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Final Master Plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ message: 'Plan already submitted' });
    if (!plan.items || plan.items.length === 0) return res.status(400).json({ message: 'Plan must have at least one item before submitting' });

    plan.status = STATUS_ON_SUBMIT;
    plan.submittedAt = new Date();
    plan.approvalChain.push({
      stage: 'bursar',
      status: 'pending',
      comments: 'Submitted for Bursar review',
      actionDate: new Date(),
    });
    await plan.save();
    return success(res, plan, 'Submitted for Bursar review');
  } catch (err) { next(err); }
};

/** POST /api/final-master-plans/:id/approve — Approve/reject at current stage */
const approveFinalMasterPlan = async (req, res, next) => {
  try {
    const plan = await FinalMasterPlan.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!plan) return res.status(404).json({ message: 'Final Master Plan not found' });

    const { action, comments, estimatedBudget } = req.body;
    const userRole = req.user.role;

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
      }
    } else {
      plan.status = 'rejected';
    }

    await plan.save();
    return success(res, plan, action === 'approve' ? 'Approved' : 'Rejected');
  } catch (err) { next(err); }
};

/** GET /api/final-master-plans/pending — Get plans pending my approval */
const getPendingFinalMasterPlans = async (req, res, next) => {
  try {
    const userRole = req.user.role;

    // Super admin sees ALL pending plans across all review stages
    if (userRole === 'super_admin') {
      const plans = await FinalMasterPlan.find({
        tenantId: req.tenantId,
        status: { $in: ['bursar_review', 'finance_committee_review', 'vc_review', 'council_review'] },
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      return success(res, plans);
    }

    const stageFilter = {
      bursar: 'bursar_review',
      finance_committee: 'finance_committee_review',
      finance_officer: 'finance_committee_review',
      vc: 'vc_review',
      council: 'council_review',
      council_member: 'council_review',
      admin: 'council_review',
    };
    const statusToFilter = stageFilter[userRole];
    if (!statusToFilter) return success(res, []);

    const filter = { tenantId: req.tenantId, status: statusToFilter };

    // Scope by faculty for department_head and dean
    if ((userRole === 'department_head' || userRole === 'dean') && req.user.faculty) {
      const cleanFaculty = req.user.faculty.replace(/^Faculty of\s+/i, '').trim();
      if (cleanFaculty) {
        filter.faculty = { $regex: new RegExp(cleanFaculty, 'i') };
      }
    }

    const plans = await FinalMasterPlan.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return success(res, plans);
  } catch (err) { next(err); }
};

/** GET /api/final-master-plans/approved-items — Get items from active Final Master Plans for Procurement creation */
const getApprovedFinalPlanItems = async (req, res, next) => {
  try {
    const { faculty, department } = req.query;
    const filter = {
      tenantId: req.tenantId,
      status: 'active',
    };

    if (faculty && faculty !== 'ALL') {
      filter.faculty = { $regex: new RegExp(faculty.replace(/^Faculty of\s+/i, '').trim(), 'i') };
    }

    const plans = await FinalMasterPlan.find(filter)
      .populate('createdBy', 'name email')
      .sort({ activatedAt: -1 });

    // Flatten items from all active plans, excluding items that already have procurement requests
    let items = [];
    for (const plan of plans) {
      for (const item of plan.items) {
        if (item.procurementCreated) continue;
        if (department && department !== 'ALL' && item.department !== department) continue;
        items.push({
          ...item.toObject(),
          planId: plan._id,
          planTitle: plan.title,
          planRef: plan.referenceNumber,
          planYear: plan.planYear,
        });
      }
    }

    return success(res, items, 'Approved Final Master Plan items for procurement');
  } catch (err) { next(err); }
};

module.exports = {
  createFinalMasterPlan,
  getFinalMasterPlans,
  getFinalMasterPlan,
  updateFinalMasterPlan,
  addItemsToFinalPlan,
  submitFinalMasterPlan,
  approveFinalMasterPlan,
  getPendingFinalMasterPlans,
  getApprovedFinalPlanItems,
};
