/**
 * Payment Service - 3-Way Matching
 */
const Payment = require('../models/payment.model');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

class PaymentService {
  async create(data, userId, tenantId) {
    let vendorId = data.vendorId;
    if (!vendorId) {
      const Vendor = require('../models/vendor.model');
      const vendor = await Vendor.findOne({ userId, tenantId });
      if (vendor) vendorId = vendor._id;
    }
    const payment = await Payment.create({
      ...data,
      vendorId: vendorId || data.vendorId,
      createdBy: userId,
      tenantId,
      paymentNumber: data.paymentNumber || `PV-${Date.now().toString().slice(-6)}`,
      invoice: data.invoice || {
        invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: data.billingDate || new Date(),
        amount: data.netAmount || data.amount || 0
      }
    });
    logger.audit('PAYMENT_CREATED', userId, { paymentId: payment._id });
    return payment;
  }

  async getAll(query, tenantId, userContext = {}) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.status && query.status !== 'all') filters.status = query.status;
    if (query.paymentType && query.paymentType !== 'all') filters.paymentType = query.paymentType;
    if (query.vendorId) filters.vendorId = query.vendorId;

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filters.$or = [
        { paymentNumber: regex },
        { 'purchaseOrder.poNumber': regex },
        { 'goodsReceivedNote.grnNumber': regex },
        { 'invoice.invoiceNumber': regex },
      ];
    }

    // Supplier users can only see their own payments
    if (userContext.role === 'supplier' && userContext.userId) {
      const Vendor = require('../models/vendor.model');
      const User = require('../models/user.model');

      const user = await User.findById(userContext.userId).select('email');

      let vendor = await Vendor.findOne({
        tenantId,
        $or: [
          { userId: userContext.userId },
          ...(user?.email ? [{ email: user.email }] : [])
        ]
      });

      if (vendor) {
        if (!vendor.userId || String(vendor.userId) !== String(userContext.userId)) {
          vendor.userId = userContext.userId;
          await vendor.save().catch(() => {});
        }
        filters.vendorId = vendor._id;
      } else {
        filters.createdBy = userContext.userId;
      }
    }

    const [data, total] = await Promise.all([
      Payment.find(filters)
        .populate('vendorId', 'companyName registrationNumber')
        .populate('contractId', 'contractNumber title contractValue')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async getById(id, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId })
      .populate('vendorId')
      .populate('contractId')
      .populate('procurementId')
      .populate('createdBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .populate('approvals.approver', 'firstName lastName role');
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
      discrepancies.push({
        field: 'amount',
        poValue: `LKR ${po.poAmount.toLocaleString()}`,
        invoiceValue: `LKR ${inv.invoiceAmount.toLocaleString()}`,
        resolution: 'Amount discrepancy requires Bursar or Finance Officer verification'
      });
    }
    if (grn && grn.items) {
      grn.items.forEach(item => {
        if (item.orderedQty !== item.receivedQty) {
          discrepancies.push({
            field: `quantity_${item.description || 'item'}`,
            poValue: `${item.orderedQty} units ordered`,
            grnValue: `${item.receivedQty} units received`,
            resolution: 'Quantity difference detected upon warehouse delivery'
          });
        }
      });
    }

    payment.matchDiscrepancies = discrepancies;
    payment.threeWayMatchStatus = discrepancies.length === 0 ? 'matched' : 'discrepancy';
    if (discrepancies.length === 0) {
      payment.status = 'pending_approval';
      const triggers = require('./workflow.triggers');
      try {
        await triggers.threeWayMatchReconciled(tenantId, {
          poNumber: payment.purchaseOrder?.poNumber,
          paymentId: payment._id,
          amount: payment.amount,
        });
      } catch (err) {
        logger.error('Failed to trigger threeWayMatchReconciled notification', err);
      }
    }
    await payment.save();
    logger.audit('THREE_WAY_MATCH', 'system', { paymentId: payment._id, result: payment.threeWayMatchStatus });
    return payment;
  }

  async resolveDiscrepancy(id, userId, resolutionNotes, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    payment.threeWayMatchStatus = 'resolved';
    payment.status = 'pending_approval';
    if (payment.matchDiscrepancies && payment.matchDiscrepancies.length > 0) {
      payment.matchDiscrepancies.forEach(d => {
        d.resolution = resolutionNotes || 'Resolved and overridden by Finance/Bursar authority';
      });
    }
    if (payment.goodsReceivedNote?.items) {
      payment.goodsReceivedNote.items.forEach(item => {
        item.acceptedQty = item.orderedQty || item.receivedQty;
      });
    }
    await payment.save();
    logger.audit('DISCREPANCY_RESOLVED', userId, { paymentId: payment._id, resolutionNotes });
    return payment;
  }

  async approve(id, userId, role, comments, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    payment.approvals.push({ approver: userId, role, status: 'approved', actionDate: new Date(), comments });
    payment.status = 'approved';
    await payment.save();
    logger.audit('PAYMENT_APPROVED', userId, { paymentId: payment._id });
    return payment;
  }

  async markPaid(id, userId, payload, tenantId) {
    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    const ref = typeof payload === 'string' ? payload : (payload?.transactionRef || payload?.reference);
    const method = typeof payload === 'object' && payload?.paymentMethod ? payload.paymentMethod : (payment.paymentMethod || 'bank_transfer');

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.paidBy = userId;
    payment.transactionRef = ref;
    payment.paymentMethod = method;
    await payment.save();
    logger.audit('PAYMENT_PROCESSED', userId, { paymentId: payment._id, amount: payment.netAmount, transactionRef: ref });

    // Sync contract paymentSchedule status to paid
    const Contract = require('../models/contract.model');
    const contract = await Contract.findOne({ _id: payment.contractId, tenantId });
    if (contract) {
      const milestone = contract.paymentSchedule.find(m => 
        m.status !== 'paid' && 
        (m.milestone?.toLowerCase().includes(payment.paymentType || '') || Math.abs(m.amount - payment.amount) < 0.01)
      ) || contract.paymentSchedule.find(m => m.status !== 'paid');

      if (milestone) {
        milestone.status = 'paid';
        await contract.save();
      }
    }

    return payment;
  }
}

module.exports = new PaymentService();
