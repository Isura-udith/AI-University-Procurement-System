/**
 * Draft Procurement Plan Controller
 * Handles user draft items, bulk saving, Dean verification workflow,
 * and fetching approved items for Master Procurement Plan integration.
 */
const mongoose = require('mongoose');
const DraftProcurementItem = require('../models/draft.procurement.model');
const { success, created, paginated } = require('../utils/response');

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

    // Regular users see their department's or their own created draft items
    if (['department_user', 'department_head', 'academic_staff'].includes(req.user.role)) {
      if (!department && req.user.department) {
        filter.department = req.user.department;
      }
    }

    const items = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return success(res, items, 'Draft procurement items retrieved');
  } catch (err) {
    next(err);
  }
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
    for (const item of items) {
      const payload = {
        tenantId: req.tenantId || 'uwu-main',
        itemCode: item.itemCode || item.dappNumber,
        description: item.description || 'Draft Procurement Item',
        faculty: item.faculty || req.user.faculty || 'Faculty of Applied Sciences',
        department: item.department || req.user.department || 'Computer Science & Informatics',
        targetOffice: item.targetOffice || '',
        category: item.category || 'Goods',
        estimatedQuantity: Number(item.quantity || item.estimatedQuantity) || 1,
        unit: item.unit || 'Units',
        estimatedUnitCost: Number(item.unitCost || item.estimatedUnitCost) || 0,
        estimatedTotalCost: (Number(item.quantity || item.estimatedQuantity) || 1) * (Number(item.unitCost || item.estimatedUnitCost) || 0),
        plannedYear: Number(item.plannedYear) || 1,
        priority: (item.priority || 'medium').toLowerCase(),
        fundingSource: item.fundingSource || 'Recurrent Budget',
        q1Amount: Number(item.q1Amount) || 100,
        q2Amount: Number(item.q2Amount) || 0,
        q3Amount: Number(item.q3Amount) || 0,
        q4Amount: Number(item.q4Amount) || 0,
        justification: item.justification || item.notes || '',
        notes: item.notes || '',
        status: item.status && item.status !== 'Draft' ? item.status : 'draft',
        createdBy: req.user._id,
      };

      // Check if item has a valid MongoDB ID
      if (item._id || (item.id && mongoose.Types.ObjectId.isValid(item.id))) {
        const targetId = item._id || item.id;
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

      // Create new draft item document
      const newItem = new DraftProcurementItem(payload);
      await newItem.save();
      savedItems.push(newItem);
    }

    return success(res, savedItems, `Saved ${savedItems.length} draft procurement item(s)`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/draft-procurements/submit
 * Submit draft procurement items for Dean verification workflow
 */
const submitDraftItems = async (req, res, next) => {
  try {
    const { itemIds } = req.body;
    const filter = { tenantId: req.tenantId || 'uwu-main', status: 'draft' };
    
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      filter._id = { $in: itemIds };
    } else {
      // If no specific IDs passed, submit all 'draft' items for user's department
      if (req.user.department) filter.department = req.user.department;
    }

    const updated = await DraftProcurementItem.updateMany(filter, {
      $set: {
        status: 'submitted_to_dean',
        submittedAt: new Date(),
      },
      $push: {
        approvalChain: {
          stage: 'dean',
          status: 'pending',
          comments: 'Submitted for Dean verification',
          actionDate: new Date(),
        }
      }
    });

    return success(res, { modifiedCount: updated.modifiedCount }, `Submitted ${updated.modifiedCount} draft item(s) for Dean Review`);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/draft-procurements/pending
 * Retrieve items pending verification for Faculty Deans and Officers
 */
const getPendingDraftItems = async (req, res, next) => {
  try {
    const filter = {
      tenantId: req.tenantId || 'uwu-main',
      status: 'submitted_to_dean',
    };

    // Filter by Dean's faculty if not super admin
    if (req.user.role === 'dean' && req.user.faculty) {
      filter.faculty = req.user.faculty;
    }

    const pendingItems = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email department faculty')
      .sort({ submittedAt: -1 });

    return success(res, pendingItems, 'Pending draft items for verification');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/draft-procurements/:id/approve
 * Dean or Officer approves/rejects a draft procurement item
 */
const approveDraftItem = async (req, res, next) => {
  try {
    const { action, comments } = req.body; // action: 'approve' | 'reject'
    const item = await DraftProcurementItem.findOne({ _id: req.params.id, tenantId: req.tenantId || 'uwu-main' });
    
    if (!item) {
      return res.status(404).json({ message: 'Draft procurement item not found' });
    }

    const isApprove = action === 'approve';
    item.status = isApprove ? 'approved' : 'rejected';
    if (isApprove) item.approvedAt = new Date();

    item.approvalChain.push({
      stage: 'dean',
      approver: req.user._id,
      status: isApprove ? 'approved' : 'rejected',
      comments: comments || (isApprove ? 'Approved by Faculty Dean' : 'Rejected during verification'),
      actionDate: new Date(),
    });

    await item.save();
    return success(res, item, isApprove ? 'Item approved for Master Procurement Plan' : 'Item rejected');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/draft-procurements/approved
 * Fetch approved draft items ready for Master Procurement Plan inclusion
 */
const getApprovedDraftItems = async (req, res, next) => {
  try {
    const { department, faculty } = req.query;
    const filter = {
      tenantId: req.tenantId || 'uwu-main',
      status: { $in: ['approved', 'dean_approved'] },
    };

    if (department) filter.department = department;
    else if (req.user.department) filter.department = req.user.department;

    if (faculty) filter.faculty = faculty;
    else if (req.user.faculty) filter.faculty = req.user.faculty;

    const approvedItems = await DraftProcurementItem.find(filter)
      .populate('createdBy', 'name email')
      .sort({ approvedAt: -1, createdAt: -1 });

    return success(res, approvedItems, 'Approved draft procurement items retrieved');
  } catch (err) {
    next(err);
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
    next(err);
  }
};

module.exports = {
  getDraftItems,
  saveDraftItems,
  submitDraftItems,
  getPendingDraftItems,
  approveDraftItem,
  getApprovedDraftItems,
  deleteDraftItem,
};
