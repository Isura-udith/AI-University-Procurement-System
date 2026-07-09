/**
 * Inventory Controller
 * Phase 7–8: Goods Receipt, Store Management, Department Issuance
 */
const { InventoryItem, GRN, Issuance } = require('../models/inventory.model');
const Procurement = require('../models/procurement.model');
const { success, created, paginated } = require('../utils/response');

// ─── Inventory Items ───────────────────────────────────────────

const getInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.description = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
      InventoryItem.find(filter).sort({ description: 1 }).skip(skip).limit(Number(limit)),
      InventoryItem.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

const getInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return success(res, item);
  } catch (err) { next(err); }
};

const getInventoryStats = async (req, res, next) => {
  try {
    const [totalItems, lowStock, outOfStock, totalValue] = await Promise.all([
      InventoryItem.countDocuments({ tenantId: req.tenantId }),
      InventoryItem.countDocuments({ tenantId: req.tenantId, status: 'low_stock' }),
      InventoryItem.countDocuments({ tenantId: req.tenantId, status: 'out_of_stock' }),
      InventoryItem.aggregate([
        { $match: { tenantId: req.tenantId } },
        { $group: { _id: null, total: { $sum: '$totalValue' } } },
      ]),
    ]);
    return success(res, {
      totalItems,
      lowStock,
      outOfStock,
      totalValue: totalValue[0]?.total || 0,
    });
  } catch (err) { next(err); }
};

// ─── Goods Receipt Notes (GRN) ─────────────────────────────────

const createGRN = async (req, res, next) => {
  try {
    const grn = new GRN({
      ...req.body,
      tenantId: req.tenantId,
      receivedBy: req.user._id,
    });

    const overallStatus = grn.overallInspectionStatus || 'pending_inspection';

    if (['passed', 'partially_passed'].includes(overallStatus)) {
      grn.status = 'accepted';
      // Update inventory for each accepted item
      for (const item of grn.items) {
        if (['passed', 'partially_passed'].includes(item.inspectionStatus)) {
          const acceptedQty = item.receivedQuantity - (item.rejectedQuantity || 0);
          let invItem = await InventoryItem.findOne({ tenantId: req.tenantId, description: item.description });
          if (!invItem) {
            invItem = new InventoryItem({
              tenantId: req.tenantId,
              description: item.description,
              unit: item.unit,
              unitCost: item.unitCost,
              quantityOnHand: 0,
              procurementId: grn.procurementId,
              supplierId: grn.supplierId,
            });
          }
          invItem.quantityOnHand += acceptedQty;
          invItem.lastReceivedAt = new Date();
          await invItem.save();
          item.inventoryItemId = invItem._id;
        }
      }
      grn.status = 'inventory_updated';

      // Update procurement status and workflowStep to 41 (Stocked)
      if (grn.procurementId) {
        await Procurement.findByIdAndUpdate(grn.procurementId, {
          status: 'delivery',
          workflowStep: 41,
        });
      }
    } else if (overallStatus === 'failed') {
      grn.status = 'rejected';
    } else {
      grn.status = 'pending_inspection';
      // If GRN is created but pending inspection, set workflowStep to 38 (GRN Created)
      if (grn.procurementId) {
        await Procurement.findByIdAndUpdate(grn.procurementId, {
          workflowStep: 38,
        });
      }
    }

    await grn.save();
    return created(res, grn, 'Goods Receipt Note created');
  } catch (err) { next(err); }
};

const getGRNs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, procurementId } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (procurementId) filter.procurementId = procurementId;

    const [data, total] = await Promise.all([
      GRN.find(filter)
        .populate('receivedBy', 'name email')
        .populate('inspectedBy', 'name email')
        .populate('procurementId', 'referenceNumber title')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      GRN.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

const getGRN = async (req, res, next) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name email')
      .populate('procurementId', 'referenceNumber title totalEstimatedCost');
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    return success(res, grn);
  } catch (err) { next(err); }
};

/** POST /api/inventory/grn/:id/inspect — Record inspection result and update inventory */
const inspectGRN = async (req, res, next) => {
  try {
    const grn = await GRN.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    const { itemInspections, overallStatus, inspectionNotes } = req.body;

    // Update individual item inspection statuses
    if (itemInspections) {
      itemInspections.forEach(insp => {
        const item = grn.items.id(insp.itemId);
        if (item) {
          item.inspectionStatus = insp.status;
          item.rejectedQuantity = insp.rejectedQuantity || 0;
          item.rejectionReason = insp.rejectionReason;
        }
      });
    }

    grn.overallInspectionStatus = overallStatus || 'passed';
    grn.inspectionNotes = inspectionNotes;
    grn.inspectedBy = req.user._id;
    grn.inspectedAt = new Date();

    if (['passed', 'partially_passed'].includes(overallStatus)) {
      grn.status = 'accepted';
      // Update inventory for each accepted item
      for (const item of grn.items) {
        if (['passed', 'partially_passed'].includes(item.inspectionStatus)) {
          const acceptedQty = item.receivedQuantity - (item.rejectedQuantity || 0);
          let invItem = await InventoryItem.findOne({ tenantId: req.tenantId, description: item.description });
          if (!invItem) {
            invItem = new InventoryItem({
              tenantId: req.tenantId,
              description: item.description,
              unit: item.unit,
              unitCost: item.unitCost,
              quantityOnHand: 0,
              procurementId: grn.procurementId,
              supplierId: grn.supplierId,
            });
          }
          invItem.quantityOnHand += acceptedQty;
          invItem.lastReceivedAt = new Date();
          await invItem.save();
          item.inventoryItemId = invItem._id;
        }
      }
      grn.status = 'inventory_updated';

      // Mark procurement as delivered/stocked if GRN is accepted (Step 41)
      if (grn.procurementId) {
        await Procurement.findByIdAndUpdate(grn.procurementId, {
          status: 'delivery',
          workflowStep: 41,
        });
      }
    } else {
      grn.status = 'rejected';
    }

    await grn.save();
    return success(res, grn, 'Inspection recorded and inventory updated');
  } catch (err) { next(err); }
};

// ─── Issuances ─────────────────────────────────────────────────

const createIssuance = async (req, res, next) => {
  try {
    const issuance = new Issuance({
      ...req.body,
      tenantId: req.tenantId,
      requestedBy: req.user._id,
    });
    await issuance.save();
    return created(res, issuance, 'Issuance request created');
  } catch (err) { next(err); }
};

const getIssuances = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    // Dept-scoped: department_head and department_user see only their dept
    if (['department_head', 'department_user'].includes(req.user.role)) {
      filter.requestingDepartment = req.user.department;
    }
    const [data, total] = await Promise.all([
      Issuance.find(filter)
        .populate('requestedBy', 'name email')
        .populate('issuedBy', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Issuance.countDocuments(filter),
    ]);
    return paginated(res, data, total, Number(page), Number(limit));
  } catch (err) { next(err); }
};

/** POST /api/inventory/issuances/:id/issue — Store manager issues items */
const issueItems = async (req, res, next) => {
  try {
    const issuance = await Issuance.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!issuance) return res.status(404).json({ message: 'Issuance not found' });

    // Deduct from inventory
    for (const item of issuance.items) {
      if (item.inventoryItemId) {
        const invItem = await InventoryItem.findById(item.inventoryItemId);
        if (invItem) {
          if (invItem.quantityOnHand < item.issuedQuantity) {
            return res.status(400).json({ message: `Insufficient stock for: ${invItem.description}` });
          }
          invItem.quantityOnHand -= item.issuedQuantity;
          invItem.lastIssuedAt = new Date();
          await invItem.save();
        }
      }
    }

    issuance.status = 'issued';
    issuance.issuedBy = req.user._id;
    issuance.issuedAt = new Date();
    await issuance.save();

    // Update procurement step to 43 (Issued)
    if (issuance.procurementId) {
      await Procurement.findByIdAndUpdate(issuance.procurementId, {
        workflowStep: 43,
      });
    }

    return success(res, issuance, 'Items issued to department');
  } catch (err) { next(err); }
};

/** POST /api/inventory/issuances/:id/confirm-receipt — Department confirms receiving items */
const confirmDeptReceipt = async (req, res, next) => {
  try {
    const issuance = await Issuance.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!issuance) return res.status(404).json({ message: 'Issuance not found' });
    issuance.status = 'received_by_department';
    issuance.departmentReceivedBy = req.user._id;
    issuance.departmentReceivedAt = new Date();
    await issuance.save();

    // ── Step 45: Mark entire procurement lifecycle as COMPLETED ──
    if (issuance.procurementId) {
      await Procurement.findByIdAndUpdate(issuance.procurementId, {
        status: 'completed',
        workflowStep: 45,
        completedAt: new Date(),
      });
    }

    return success(res, issuance, 'Receipt confirmed — Procurement Lifecycle Completed (Step 45/45)');
  } catch (err) { next(err); }
};

/** POST /api/inventory/issuances/:id/approve — Store manager approves issuance request */
const approveIssuance = async (req, res, next) => {
  try {
    const issuance = await Issuance.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!issuance) return res.status(404).json({ message: 'Issuance not found' });

    issuance.status = 'approved';
    await issuance.save();

    return success(res, issuance, 'Issuance request approved');
  } catch (err) { next(err); }
};

module.exports = {
  getInventory, getInventoryItem, getInventoryStats,
  createGRN, getGRNs, getGRN, inspectGRN,
  createIssuance, getIssuances, issueItems, confirmDeptReceipt, approveIssuance,
};
