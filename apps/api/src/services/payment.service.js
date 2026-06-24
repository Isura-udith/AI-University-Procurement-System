/**
 * Payment Service - 3-Way Matching
 */
const Payment = require('../models/payment.model');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

class PaymentService {
  async create(data, userId, tenantId) {
    const payment = await Payment.create({ ...data, createdBy: userId, tenantId });
    logger.audit('PAYMENT_CREATED', userId, { paymentId: payment._id });
    return payment;
  }

  async getAll(query, tenantId, userContext = {}) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.status) filters.status = query.status;
    if (query.vendorId) filters.vendorId = query.vendorId;

    // Supplier users can only see their own payments
    if (userContext.role === 'supplier' && userContext.userId) {
      const Vendor = require('../models/vendor.model');
      const vendor = await Vendor.findOne({ userId: userContext.userId, tenantId });
      if (vendor) {
        filters.vendorId = vendor._id;
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    const [data, total] = await Promise.all([
      Payment.find(filters).populate('vendorId', 'companyName').populate('contractId', 'contractNumber title').sort(sort).skip(skip).limit(limit),
      Payment.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async getById(id, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId }).populate('vendorId').populate('contractId').populate('procurementId').populate('approvals.approver', 'firstName lastName');
    if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
    return payment;
  }

  async performThreeWayMatch(id, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const discrepancies = [];
    const po = payment.purchaseOrder;
    const grn = payment.goodsReceivedNote;
    const inv = payment.invoice;

    if (po && inv && Math.abs(po.poAmount - inv.invoiceAmount) > 0.01) {
      discrepancies.push({ field: 'amount', poValue: String(po.poAmount), invoiceValue: String(inv.invoiceAmount) });
    }
    if (grn && grn.items) {
      grn.items.forEach(item => {
        if (item.orderedQty !== item.receivedQty) {
          discrepancies.push({ field: `quantity_${item.description}`, poValue: String(item.orderedQty), grnValue: String(item.receivedQty) });
        }
      });
    }

    payment.matchDiscrepancies = discrepancies;
    payment.threeWayMatchStatus = discrepancies.length === 0 ? 'matched' : 'discrepancy';
    if (discrepancies.length === 0) payment.status = 'pending_approval';
    await payment.save();
    logger.audit('THREE_WAY_MATCH', 'system', { paymentId: payment._id, result: payment.threeWayMatchStatus });
    return payment;
  }

  async approve(id, userId, comments, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    payment.approvals.push({ approver: userId, status: 'approved', actionDate: new Date(), comments });
    payment.status = 'approved';
    await payment.save();
    logger.audit('PAYMENT_APPROVED', userId, { paymentId: payment._id });
    return payment;
  }

  async markPaid(id, userId, transactionRef, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.paidBy = userId;
    payment.transactionRef = transactionRef;
    await payment.save();
    logger.audit('PAYMENT_PROCESSED', userId, { paymentId: payment._id, amount: payment.netAmount });
    return payment;
  }
}

module.exports = new PaymentService();
