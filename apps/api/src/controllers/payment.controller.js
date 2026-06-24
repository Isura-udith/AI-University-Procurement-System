/**
 * Payment Controller
 */
const paymentService = require('../services/payment.service');
const { success, created, paginated } = require('../utils/response');

const createPayment = async (req, res, next) => {
  try { return created(res, await paymentService.create(req.body, req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const getAllPayments = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await paymentService.getAll(
      req.query,
      req.tenantId,
      { role: req.user.role, userId: req.user._id }
    );
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};
const getPayment = async (req, res, next) => {
  try { return success(res, await paymentService.getById(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const threeWayMatch = async (req, res, next) => {
  try { return success(res, await paymentService.performThreeWayMatch(req.params.id, req.tenantId), 'Match completed'); } catch (err) { next(err); }
};
const approvePayment = async (req, res, next) => {
  try { return success(res, await paymentService.approve(req.params.id, req.user._id, req.body.comments, req.tenantId), 'Approved'); } catch (err) { next(err); }
};
const markPaid = async (req, res, next) => {
  try { return success(res, await paymentService.markPaid(req.params.id, req.user._id, req.body.transactionRef, req.tenantId), 'Paid'); } catch (err) { next(err); }
};

module.exports = { createPayment, getAllPayments, getPayment, threeWayMatch, approvePayment, markPaid };
