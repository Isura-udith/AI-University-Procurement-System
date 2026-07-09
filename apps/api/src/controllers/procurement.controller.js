const procurementService = require('../services/procurement.service');
const { success, created, paginated } = require('../utils/response');

const createProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.create(req.body, req.user._id, req.tenantId);
    return created(res, result, 'Requisition created');
  } catch (err) { next(err); }
};

const getAllProcurements = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await procurementService.getAll(
      req.query,
      req.tenantId,
      { role: req.user.role, userId: req.user._id, faculty: req.user.faculty, department: req.user.department }
    );
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};

const getProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.getById(req.params.id, req.tenantId);
    return success(res, result);
  } catch (err) { next(err); }
};

const updateProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.update(req.params.id, req.body, req.user._id, req.user.role, req.tenantId);
    return success(res, result, 'Updated');
  } catch (err) { next(err); }
};

const submitProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.submit(req.params.id, req.user._id, req.tenantId);
    return success(res, result, 'Submitted for approval');
  } catch (err) { next(err); }
};

const approveProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.approve(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body.stage,
      req.body.comments,
      req.tenantId
    );
    return success(res, result, 'Approved');
  } catch (err) { next(err); }
};

const rejectProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.reject(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body.stage,
      req.body.comments,
      req.tenantId
    );
    return success(res, result, 'Rejected');
  } catch (err) { next(err); }
};

const lockBudget = async (req, res, next) => {
  try {
    const result = await procurementService.lockBudget(req.params.id, req.user._id, req.tenantId);
    return success(res, result, 'Budget locked');
  } catch (err) { next(err); }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const result = await procurementService.getDashboardStats(
      req.tenantId,
      { role: req.user.role, userId: req.user._id, faculty: req.user.faculty },
      req.query
    );
    return success(res, result);
  } catch (err) { next(err); }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const result = await procurementService.getMyPendingApprovals(
      req.user._id,
      req.user.role,
      req.tenantId,
      { department: req.user.department, faculty: req.user.faculty }
    );
    return success(res, result);
  } catch (err) { next(err); }
};

const unlockBudget = async (req, res, next) => {
  try {
    const result = await procurementService.unlockBudget(req.params.id, req.user._id, req.tenantId);
    return success(res, result, 'Budget unlocked');
  } catch (err) { next(err); }
};

const getBudgetStatus = async (req, res, next) => {
  try {
    const result = await procurementService.getBudgetStatus(req.query, req.tenantId);
    return success(res, result);
  } catch (err) { next(err); }
};

const checkBudgetCompliance = async (req, res, next) => {
  try {
    const result = await procurementService.validateBudgetCompliance(req.params.id, req.tenantId);
    return success(res, result);
  } catch (err) { next(err); }
};

const deleteProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.deleteProcurement(req.params.id, req.user._id, req.user.role, req.tenantId);
    return success(res, result, 'Deleted');
  } catch (err) { next(err); }
};

const publishProcurement = async (req, res, next) => {
  try {
    const result = await procurementService.publish(req.params.id, req.user._id, req.tenantId);
    return success(res, result, 'Published to suppliers');
  } catch (err) { next(err); }
};

const getPublicProcurements = async (req, res, next) => {
  try {
    // Public endpoint — tenantId may not be set (no auth), use header or default
    const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'uwu-main';
    const result = await procurementService.getPublicProcurements(tenantId);
    return success(res, result);
  } catch (err) { next(err); }
};

module.exports = { createProcurement, getAllProcurements, getProcurement, updateProcurement, submitProcurement, approveProcurement, rejectProcurement, lockBudget, unlockBudget, getDashboardStats, getPendingApprovals, getBudgetStatus, checkBudgetCompliance, deleteProcurement, publishProcurement, getPublicProcurements };
