/**
 * Contract Controller
 */
const contractService = require('../services/contract.service');
const { success, created, paginated } = require('../utils/response');

const createContract = async (req, res, next) => {
  try { return created(res, await contractService.create(req.body, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const getAllContracts = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await contractService.getAll(
      req.query,
      req.tenantId,
      { role: req.user.role, userId: req.user._id }
    );
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};
const getContractStats = async (req, res, next) => {
  try {
    const stats = await contractService.getStats(req.tenantId, { role: req.user.role, userId: req.user._id });
    return success(res, stats);
  } catch (err) { next(err); }
};
const getContract = async (req, res, next) => {
  try { return success(res, await contractService.getById(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const updateContract = async (req, res, next) => {
  try { return success(res, await contractService.update(req.params.id, req.body, req.user._id, req.tenantId), 'Updated'); } catch (err) { next(err); }
};
const deleteContract = async (req, res, next) => {
  try { return success(res, await contractService.delete(req.params.id, req.user._id, req.tenantId), 'Deleted'); } catch (err) { next(err); }
};
const signContract = async (req, res, next) => {
  try { return success(res, await contractService.sign(req.params.id, req.user._id, req.body.role, req.body.signatureHash, req.tenantId), 'Signed'); } catch (err) { next(err); }
};
const terminateContract = async (req, res, next) => {
  try { return success(res, await contractService.terminate(req.params.id, req.body, req.user._id, req.tenantId), 'Terminated'); } catch (err) { next(err); }
};
const suspendContract = async (req, res, next) => {
  try { return success(res, await contractService.suspend(req.params.id, req.body, req.user._id, req.tenantId), 'Suspended'); } catch (err) { next(err); }
};
const extendContract = async (req, res, next) => {
  try { return success(res, await contractService.extend(req.params.id, req.body, req.user._id, req.tenantId), 'Extended'); } catch (err) { next(err); }
};
const addVariation = async (req, res, next) => {
  try { return success(res, await contractService.addVariation(req.params.id, req.body, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const addAmendment = async (req, res, next) => {
  try { return success(res, await contractService.addAmendment(req.params.id, req.body, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const addMilestone = async (req, res, next) => {
  try { return success(res, await contractService.addMilestone(req.params.id, req.body, req.tenantId)); } catch (err) { next(err); }
};
const updateMilestone = async (req, res, next) => {
  try { return success(res, await contractService.updateMilestone(req.params.id, req.params.milestoneId, req.body, req.tenantId)); } catch (err) { next(err); }
};
const addDeliverable = async (req, res, next) => {
  try { return success(res, await contractService.addDeliverable(req.params.id, req.body, req.tenantId)); } catch (err) { next(err); }
};
const updateDeliverable = async (req, res, next) => {
  try { return success(res, await contractService.updateDeliverable(req.params.id, req.params.deliverableId, req.body, req.tenantId)); } catch (err) { next(err); }
};
const updatePerformance = async (req, res, next) => {
  try { return success(res, await contractService.updatePerformanceMetrics(req.params.id, req.body, req.tenantId)); } catch (err) { next(err); }
};
const markPaymentPaid = async (req, res, next) => {
  try { return success(res, await contractService.markPaymentPaid(req.params.id, req.params.paymentIdx, req.body, req.user._id, req.tenantId), 'Payment marked'); } catch (err) { next(err); }
};
const getAuditLog = async (req, res, next) => {
  try { return success(res, await contractService.getAuditLog(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const getExpiring = async (req, res, next) => {
  try { return success(res, await contractService.getExpiringContracts(req.tenantId, req.query.days)); } catch (err) { next(err); }
};
const getDeliveries = async (req, res, next) => {
  try { return success(res, await contractService.getDeliveries(req.tenantId)); } catch (err) { next(err); }
};
const recordGRN = async (req, res, next) => {
  try { return success(res, await contractService.recordGRN(req.params.id, req.body, req.tenantId), 'GRN Recorded'); } catch (err) { next(err); }
};
const resolveDiscrepancy = async (req, res, next) => {
  try { return success(res, await contractService.resolveDiscrepancy(req.params.id, req.tenantId), 'Resolved'); } catch (err) { next(err); }
};

module.exports = {
  createContract, getAllContracts, getContractStats, getContract, updateContract, deleteContract,
  signContract, terminateContract, suspendContract, extendContract,
  addVariation, addAmendment, addMilestone, updateMilestone,
  addDeliverable, updateDeliverable, updatePerformance, markPaymentPaid,
  getAuditLog, getExpiring, getDeliveries, recordGRN, resolveDiscrepancy,
};
