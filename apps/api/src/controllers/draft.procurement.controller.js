/**
 * Draft Procurement Plan Controller
 * Handles user draft items, bulk saving, multi-stage approval workflow with strict role authorization:
 * Staff Input -> HOD (Faculty items) -> Dean (Faculty items) -> Bursar (ALL items) -> FC -> VC -> Council -> Approved
 * and compiling approved items into a Final Master Plan.
 */
const mongoose = require('mongoose');
const DraftProcurementItem = require('../models/draft.procurement.model');
const FinalMasterPlan = require('../models/final.master.plan.model');
const User = require('../models/user.model');
const { success, created, paginated } = require('../utils/response');

const STAGE_ROLES = {
  hod: ['department_head', 'academic_staff', 'hod', 'super_admin', 'admin'],
  dean: ['dean', 'super_admin', 'admin'],
  bursar: ['bursar', 'super_admin', 'admin'],
  fc: ['finance_committee', 'finance_officer', 'super_admin', 'admin'],
  finance_committee: ['finance_committee', 'finance_officer', 'super_admin', 'admin'],
  vc: ['vc', 'vice_chancellor', 'super_admin', 'admin'],
  vice_chancellor: ['vc', 'vice_chancellor', 'super_admin', 'admin'],
  council: ['council', 'super_admin', 'admin'],
};

const ROLE_DEFAULT_STAGE = {
  department_head: 'hod',
  academic_staff: 'hod',
  hod: 'hod',
  dean: 'dean',
  bursar: 'bursar',
  finance_committee: 'fc',
  finance_officer: 'fc',
  vc: 'vc',
  vice_chancellor: 'vc',
  council: 'council',
};

const escapeRegex = (str) => (str ? String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

const handleControllerError = (err, res, next) => {
  if (typeof next === 'function') {
    return next(err);
  }
  const statusCode = err.statusCode || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Server error',
  });
};

/**
 * GET /api/draft-procurements
 * List draft procurement items for current user or department
 */
const getDraftItems = async (req, res, next) => {
  try {
    const { department, faculty, status } = req.query;
    const filter = { tenantId: req.tenantId || 'uwu-main' };

    if (department && department !== 'ALL') filter.department = department;
    if (faculty && faculty !== 'ALL') filter.faculty = faculty;
    if (status && status !== 'ALL') filter.status = status;

    // Regular users and HODs see their department's or their own created draft items
    if (['department_user', 'department_head', 'academic_staff', 'hod'].includes(req.user?.role)) {
      if (!department && req.user?.department) {
        const cleanDept = req.user.department.replace(/^Department of\s+/i, '').trim();
        const safeDept = escapeRegex(cleanDept);
        filter.$or = [
          { department: { $regex: new RegExp(safeDept, 'i') } },
          { createdBy: req.user._id }
        ];
      }
    }

    const items = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return success(res, items, 'Draft procurement items retrieved');
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * Helper to normalize user/frontend status strings to valid schema enum values
 */
const normalizeStatus = (statusStr) => {
  if (!statusStr) return 'draft';
  const s = String(statusStr).toLowerCase().trim();
  if (s === 'submitted to hod' || s === 'submitted_to_hod') return 'submitted_to_hod';
  if (s === 'hod approved' || s === 'hod_approved') return 'hod_approved';
  if (s === 'submitted to dean' || s === 'submitted_to_dean') return 'submitted_to_dean';
  if (s === 'submitted to bursar' || s === 'submitted_to_bursar') return 'submitted_to_bursar';
  if (s === 'submitted to fc' || s === 'submitted_to_fc') return 'submitted_to_fc';
  if (s === 'submitted to vc' || s === 'submitted_to_vc') return 'submitted_to_vc';
  if (s === 'submitted to council' || s === 'submitted_to_council') return 'submitted_to_council';
  if (s === 'approved' || s === 'council_approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'draft';
};

/**
 * POST /api/draft-procurements/save
 * Bulk save/update draft procurement items for a user/department
 */
const saveDraftItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    const savedItems = [];
    const activeStatuses = [
      'submitted_to_hod', 'hod_approved',
      'submitted_to_dean', 'dean_approved',
      'submitted_to_bursar', 'bursar_approved',
      'submitted_to_fc', 'fc_approved',
      'submitted_to_vc', 'vc_approved',
      'submitted_to_council', 'council_approved',
      'approved'
    ];

    for (const item of items) {
      const payload = {
        tenantId: req.tenantId || 'uwu-main',
        itemCode: item.itemCode || item.dappNumber,
        description: item.description || 'Draft Procurement Item',
        faculty: item.faculty || (req.user && req.user.faculty) || 'Faculty of Applied Sciences',
        department: item.department || (req.user && req.user.department) || 'Computer Science & Informatics',
        targetOffice: item.targetOffice || '',
        category: item.category || 'Goods',
        estimatedQuantity: Number(item.quantity || item.estimatedQuantity) || 1,
        unit: item.unit || 'Units',
        estimatedUnitCost: Number(item.unitCost || item.estimatedUnitCost) || 0,
        estimatedTotalCost: (Number(item.quantity || item.estimatedQuantity) || 1) * (Number(item.unitCost || item.estimatedUnitCost) || 0),
        plannedYear: Number(item.plannedYear) || 1,
        year: Number(item.year || item.plannedYear) || 2028,
        priority: (item.priority || 'medium').toLowerCase(),
        fundingSource: item.fundingSource || 'GOSL Treasury Funds',
        q1Amount: Number(item.q1Amount) || 100,
        q2Amount: Number(item.q2Amount) || 0,
        q3Amount: Number(item.q3Amount) || 0,
        q4Amount: Number(item.q4Amount) || 0,
        justification: item.justification || item.notes || '',
        notes: item.notes || '',
        status: normalizeStatus(item.status),
        createdBy: req.user?._id,
      };

      // Check if item has a valid MongoDB ID
      const targetId = item._id || item.dbId || (item.id && mongoose.Types.ObjectId.isValid(item.id) ? item.id : null);
      if (targetId) {
        const existingItem = await DraftProcurementItem.findOne({ _id: targetId, tenantId: req.tenantId || 'uwu-main' });
        if (existingItem) {
          // Protect active approval workflow items from accidental status reset back to draft
          if (activeStatuses.includes(existingItem.status) && (payload.status === 'draft' || !item.status)) {
            payload.status = existingItem.status;
          }
          const updated = await DraftProcurementItem.findOneAndUpdate(
            { _id: targetId, tenantId: req.tenantId || 'uwu-main' },
            { $set: payload },
            { new: true, runValidators: true }
          );
          if (updated) {
            savedItems.push(updated);
            continue;
          }
        }
      }

      // Create new draft item document
      const newItem = new DraftProcurementItem(payload);
      await newItem.save();
      savedItems.push(newItem);
    }

    return success(res, savedItems, `Saved ${savedItems.length} draft procurement item(s)`);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * POST /api/draft-procurements/submit
 * Submit draft procurement items for verification workflow
 */
const submitDraftItems = async (req, res, next) => {
  try {
    const { itemIds, targetStage } = req.body;
    const filter = { tenantId: req.tenantId || 'uwu-main' };
    
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      const validIds = itemIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
        filter._id = { $in: validIds };
      }
    } else {
      if (req.user && req.user.department) {
        const cleanDept = req.user.department.replace(/^Department of\s+/i, '').trim();
        filter.department = { $regex: new RegExp(escapeRegex(cleanDept), 'i') };
      }
    }

    // Protect active workflow items: only submit items that are currently in draft or rejected status
    filter.status = { $in: ['draft', 'rejected'] };

    const isHod = ['department_head', 'academic_staff', 'hod'].includes(req.user?.role);
    const nextStatus = (isHod || targetStage === 'dean') ? 'submitted_to_dean' : 'submitted_to_hod';
    const nextStageName = (isHod || targetStage === 'dean') ? 'dean' : 'hod';

    const updated = await DraftProcurementItem.updateMany(filter, {
      $set: {
        status: nextStatus,
        submittedAt: new Date(),
      },
      $push: {
        approvalChain: {
          stage: nextStageName,
          status: 'pending',
          comments: (isHod || targetStage === 'dean') ? 'Submitted by Department HOD directly to Dean for review' : 'Submitted for HOD verification',
          actionDate: new Date(),
        }
      }
    });

    return success(res, { modifiedCount: updated.modifiedCount, targetStage: nextStageName }, `Submitted ${updated.modifiedCount} draft item(s) for ${nextStageName.toUpperCase()} Review`);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * GET /api/draft-procurements/pending-hod
 * Retrieve items pending HOD verification (HOD role authorized only)
 */
const getPendingHodItems = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (!STAGE_ROLES.hod.includes(userRole)) {
      return res.status(403).json({ message: 'Unauthorized. Only HOD / Department Head role can access HOD queue.' });
    }

    const filter = {
      tenantId: req.tenantId || 'uwu-main',
      status: 'submitted_to_hod',
    };

    if (userRole !== 'super_admin' && userRole !== 'admin') {
      if (req.user?.department) {
        const cleanDept = req.user.department.replace(/^Department of\s+/i, '').trim();
        if (cleanDept) {
          filter.department = { $regex: new RegExp(escapeRegex(cleanDept), 'i') };
        }
      } else if (req.user?.faculty) {
        const cleanFaculty = req.user.faculty.replace(/^Faculty of\s+/i, '').trim();
        if (cleanFaculty) {
          filter.faculty = { $regex: new RegExp(escapeRegex(cleanFaculty), 'i') };
        }
      }
    }

    const pendingItems = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email department faculty')
      .sort({ submittedAt: -1 });

    return success(res, pendingItems, 'Pending draft items for HOD verification');
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * POST /api/draft-procurements/:id/hod-approve
 * HOD approves/rejects a draft procurement item
 */
const hodApproveDraftItem = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (!STAGE_ROLES.hod.includes(userRole)) {
      return res.status(403).json({ message: 'Unauthorized. Only HOD / Department Head role can approve items at HOD stage.' });
    }

    const { action, comments } = req.body;
    const item = await DraftProcurementItem.findOne({ _id: req.params.id, tenantId: req.tenantId || 'uwu-main' });
    
    if (!item) {
      return res.status(404).json({ message: 'Draft procurement item not found' });
    }

    if (item.status !== 'submitted_to_hod') {
      return res.status(400).json({ message: 'Item is not pending HOD approval' });
    }

    const isApprove = action === 'approve';

    item.approvalChain.push({
      stage: 'hod',
      approver: req.user?._id,
      status: isApprove ? 'approved' : 'rejected',
      comments: comments || (isApprove ? 'Approved by Department HOD' : 'Rejected by HOD'),
      actionDate: new Date(),
    });

    if (isApprove) {
      item.status = 'submitted_to_dean';
    } else {
      item.status = 'rejected';
    }

    await item.save();
    return success(res, item, isApprove ? 'Item approved by HOD and forwarded to Dean' : 'Item rejected by HOD');
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * GET /api/draft-procurements/pending
 * Retrieve pending items for requested stage with strict role checking
 */
const getPendingDraftItems = async (req, res, next) => {
  try {
    const { stage } = req.query;
    const userRole = req.user?.role;

    let targetStage = stage ? stage.toLowerCase().trim() : (ROLE_DEFAULT_STAGE[userRole] || 'dean');

    const allowedRoles = STAGE_ROLES[targetStage] || STAGE_ROLES.dean;
    if (userRole && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Unauthorized. Role '${userRole}' is not permitted to access or view the ${targetStage.toUpperCase()} approval queue.`
      });
    }

    const filter = { tenantId: req.tenantId || 'uwu-main' };

    if (targetStage === 'hod') {
      filter.status = 'submitted_to_hod';
      if (!['super_admin', 'admin'].includes(userRole)) {
        if (req.user?.department) {
          const cleanDept = req.user.department.replace(/^Department of\s+/i, '').trim();
          if (cleanDept) filter.department = { $regex: new RegExp(escapeRegex(cleanDept), 'i') };
        } else if (req.user?.faculty) {
          const cleanFaculty = req.user.faculty.replace(/^Faculty of\s+/i, '').trim();
          if (cleanFaculty) filter.faculty = { $regex: new RegExp(escapeRegex(cleanFaculty), 'i') };
        }
      }
    } else if (targetStage === 'dean') {
      filter.status = 'submitted_to_dean';
      if (userRole === 'dean' && req.user?.faculty) {
        const cleanFaculty = req.user.faculty.replace(/^Faculty of\s+/i, '').trim();
        if (cleanFaculty) filter.faculty = { $regex: new RegExp(escapeRegex(cleanFaculty), 'i') };
      }
    } else if (targetStage === 'bursar') {
      filter.status = 'submitted_to_bursar';
    } else if (targetStage === 'fc' || targetStage === 'finance_committee') {
      filter.status = 'submitted_to_fc';
    } else if (targetStage === 'vc' || targetStage === 'vice_chancellor') {
      filter.status = 'submitted_to_vc';
    } else if (targetStage === 'council') {
      filter.status = 'submitted_to_council';
    } else {
      filter.status = 'submitted_to_dean';
    }

    const pendingItems = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email department faculty')
      .sort({ submittedAt: -1, createdAt: -1 });

    return success(res, pendingItems, `Pending draft items for stage: ${targetStage}`);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * POST /api/draft-procurements/:id/approve
 * Approves/rejects a draft procurement item at a specific stage with strict role verification
 */
const approveDraftItem = async (req, res, next) => {
  try {
    const { action, comments, stage } = req.body;
    const userRole = req.user?.role;

    const item = await DraftProcurementItem.findOne({ _id: req.params.id, tenantId: req.tenantId || 'uwu-main' });
    
    if (!item) {
      return res.status(404).json({ message: 'Draft procurement item not found' });
    }

    const currentStage = stage || (
      item.status === 'submitted_to_hod' ? 'hod' :
      item.status === 'submitted_to_dean' ? 'dean' :
      item.status === 'submitted_to_bursar' ? 'bursar' :
      item.status === 'submitted_to_fc' ? 'fc' :
      item.status === 'submitted_to_vc' ? 'vc' :
      item.status === 'submitted_to_council' ? 'council' : 'dean'
    );

    const allowedRoles = STAGE_ROLES[currentStage] || STAGE_ROLES.dean;
    if (userRole && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Unauthorized. Role '${userRole}' is not permitted to approve items at the ${currentStage.toUpperCase()} stage.`
      });
    }

    const isApprove = action === 'approve';

    item.approvalChain.push({
      stage: currentStage,
      approver: req.user?._id,
      status: isApprove ? 'approved' : 'rejected',
      comments: comments || (isApprove ? `Approved at ${currentStage.toUpperCase()} stage` : `Rejected at ${currentStage.toUpperCase()} stage`),
      actionDate: new Date(),
    });

    if (isApprove) {
      if (currentStage === 'hod') {
        item.status = 'submitted_to_dean';
      } else if (currentStage === 'dean') {
        item.status = 'submitted_to_bursar';
      } else if (currentStage === 'bursar') {
        item.status = 'submitted_to_fc';
      } else if (currentStage === 'fc' || currentStage === 'finance_committee') {
        item.status = 'submitted_to_vc';
      } else if (currentStage === 'vc' || currentStage === 'vice_chancellor') {
        item.status = 'submitted_to_council';
      } else if (currentStage === 'council') {
        item.status = 'approved';
        item.approvedAt = new Date();
      } else {
        item.status = 'approved';
        item.approvedAt = new Date();
      }
    } else {
      item.status = 'rejected';
    }

    await item.save();
    return success(res, item, isApprove ? `Item approved at ${currentStage.toUpperCase()} stage` : `Item rejected at ${currentStage.toUpperCase()} stage`);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * GET /api/draft-procurements/approved
 * Fetch approved draft items ready for Final Master Plan inclusion
 */
const getApprovedDraftItems = async (req, res, next) => {
  try {
    const { department, faculty } = req.query;
    const filter = {
      tenantId: req.tenantId || 'uwu-main',
      status: { $in: ['approved', 'council_approved'] },
      $or: [{ masterPlanId: { $exists: false } }, { masterPlanId: null }]
    };

    if (department && department !== 'ALL') filter.department = department;
    if (faculty && faculty !== 'ALL') filter.faculty = faculty;

    const approvedItems = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email')
      .sort({ approvedAt: -1, createdAt: -1 });

    return success(res, approvedItems, 'Approved draft procurement items retrieved');
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * POST /api/draft-procurements/compile-final
 * Compiles approved draft procurement items into a Final Master Plan document
 */
const compileToFinalMasterPlan = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const allowedCompileRoles = ['bursar', 'procurement_officer', 'admin', 'super_admin', 'council'];
    if (userRole && !allowedCompileRoles.includes(userRole)) {
      return res.status(403).json({ message: `Unauthorized. Role '${userRole}' cannot compile Final Master Plans.` });
    }

    const { title, planYear, draftItemIds } = req.body;

    if (!Array.isArray(draftItemIds) || draftItemIds.length === 0) {
      return res.status(400).json({ message: 'draftItemIds array is required' });
    }

    const approvedDraftItems = await DraftProcurementItem.find({
      _id: { $in: draftItemIds },
      tenantId: req.tenantId || 'uwu-main',
      status: { $in: ['approved', 'council_approved', 'dean_approved', 'bursar_approved', 'fc_approved', 'vc_approved'] },
    });

    if (approvedDraftItems.length === 0) {
      return res.status(400).json({ message: 'No eligible approved draft items found for compilation' });
    }

    const year = Number(planYear) || new Date().getFullYear();
    const referenceNumber = `FMP-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    const fmpItems = approvedDraftItems.map(d => ({
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
      year: d.year || (d.plannedYear >= 2000 ? d.plannedYear : 2028),
      priority: (d.priority || 'medium').toLowerCase(),
      fundingSource: d.fundingSource,
      justification: d.justification || d.notes,
    }));

    const totalEstimatedBudget = fmpItems.reduce((acc, curr) => acc + (curr.estimatedTotalCost || 0), 0);

    const newFinalPlan = new FinalMasterPlan({
      tenantId: req.tenantId || 'uwu-main',
      referenceNumber,
      title: title || `Final Master Procurement Plan ${year}`,
      description: `Compiled from ${approvedDraftItems.length} approved DAPP items`,
      planYear: year,
      items: fmpItems,
      totalEstimatedBudget,
      status: 'draft',
      createdBy: req.user?._id,
      department: req.user?.department || approvedDraftItems[0].department,
      faculty: req.user?.faculty || approvedDraftItems[0].faculty,
    });

    await newFinalPlan.save();

    await DraftProcurementItem.updateMany(
      { _id: { $in: approvedDraftItems.map(i => i._id) } },
      { $set: { masterPlanId: newFinalPlan._id } }
    );

    return created(res, newFinalPlan, `Successfully compiled ${approvedDraftItems.length} approved draft items into Final Master Plan (${referenceNumber})`);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

/**
 * DELETE /api/draft-procurements/:id
 * Delete a draft item
 */
const deleteDraftItem = async (req, res, next) => {
  try {
    const item = await DraftProcurementItem.findOne({ _id: req.params.id, tenantId: req.tenantId || 'uwu-main' });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    await item.deleteOne();
    return success(res, null, 'Draft procurement item deleted');
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = {
  getDraftItems,
  saveDraftItems,
  submitDraftItems,
  getPendingHodItems,
  hodApproveDraftItem,
  getPendingDraftItems,
  approveDraftItem,
  getApprovedDraftItems,
  compileToFinalMasterPlan,
  deleteDraftItem,
};
