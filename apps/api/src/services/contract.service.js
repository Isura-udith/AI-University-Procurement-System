/**
 * Contract Service
 */
const Contract = require('../models/contract.model');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

class ContractService {
  async create(data, userId, tenantId) {
    const contract = await Contract.create({ ...data, createdBy: userId, tenantId });
    logger.audit('CONTRACT_CREATED', userId, { contractId: contract._id });
    return contract;
  }

  async getAll(query, tenantId, userContext = {}) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.status) filters.status = query.status;
    if (query.vendorId) filters.vendorId = query.vendorId;

    // Supplier users can only see their own contracts
    if (userContext.role === 'supplier' && userContext.userId) {
      const Vendor = require('../models/vendor.model');
      const vendor = await Vendor.findOne({ userId: userContext.userId, tenantId });
      if (vendor) {
        filters.vendorId = vendor._id;
      } else {
        // Supplier with no vendor profile — return empty
        return { data: [], total: 0, page, limit };
      }
    }

    const [data, total] = await Promise.all([
      Contract.find(filters).populate('vendorId', 'companyName').populate('procurementId', 'referenceNumber title').sort(sort).skip(skip).limit(limit),
      Contract.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async getById(id, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId }).populate('vendorId').populate('procurementId').populate('tenderId').populate('bidId').populate('signatures.signatory', 'firstName lastName').populate('createdBy', 'firstName lastName');
    if (!contract) throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    return contract;
  }

  async update(id, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    if (!['draft', 'pending_signature'].includes(contract.status)) {
      throw Object.assign(new Error('Cannot edit contract in current status'), { statusCode: 400 });
    }
    Object.assign(contract, data);
    await contract.save();
    logger.audit('CONTRACT_UPDATED', userId, { contractId: contract._id });
    return contract;
  }

  async delete(id, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    if (contract.status !== 'draft') {
      throw Object.assign(new Error('Can only delete draft contracts'), { statusCode: 400 });
    }
    await Contract.deleteOne({ _id: id });
    logger.audit('CONTRACT_DELETED', userId, { contractId: id });
    return { message: 'Contract deleted' };
  }

  async sign(id, userId, role, signatureHash, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    contract.signatures.push({ signatory: userId, role, signatureHash, signedAt: new Date(), verified: true });
    if (contract.signatures.length >= 2) contract.status = 'active';
    await contract.save();
    logger.audit('CONTRACT_SIGNED', userId, { contractId: contract._id, role });
    return contract;
  }

  async terminate(id, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    contract.status = 'terminated';
    contract.completionDate = new Date();
    if (data.reason) {
      contract.documents.push({ name: 'Termination Notice', type: 'termination', uploadedAt: new Date() });
    }
    await contract.save();
    logger.audit('CONTRACT_TERMINATED', userId, { contractId: contract._id, reason: data.reason });
    return contract;
  }

  async suspend(id, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    contract.status = 'suspended';
    await contract.save();
    logger.audit('CONTRACT_SUSPENDED', userId, { contractId: contract._id, reason: data.reason });
    return contract;
  }

  async extend(id, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (data.newEndDate) contract.endDate = new Date(data.newEndDate);
    if (data.newDuration) contract.duration = data.newDuration;
    await contract.save();
    logger.audit('CONTRACT_EXTENDED', userId, { contractId: contract._id, newEndDate: data.newEndDate });
    return contract;
  }

  async addVariation(id, variation, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const num = (contract.variations?.length || 0) + 1;
    contract.variations.push({ ...variation, number: num, status: 'pending' });
    contract.totalVariationAmount = contract.variations.reduce((s, v) => s + (v.amount || 0), 0);
    await contract.save();
    return contract;
  }

  async addAmendment(id, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    // Amendments stored as variations with type amendment
    const num = (contract.variations?.length || 0) + 1;
    contract.variations.push({ ...data, number: num, status: 'pending', description: `Amendment: ${data.description || ''}` });
    await contract.save();
    logger.audit('CONTRACT_AMENDMENT_ADDED', userId, { contractId: contract._id });
    return contract;
  }

  async addMilestone(id, data, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    contract.paymentSchedule.push({ milestone: data.milestone, amount: data.amount, dueDate: data.dueDate, status: 'pending' });
    await contract.save();
    return contract;
  }

  async updateMilestone(id, milestoneId, data, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const milestone = contract.paymentSchedule.id(milestoneId);
    if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });
    Object.assign(milestone, data);
    await contract.save();
    return contract;
  }

  async addDeliverable(id, data, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    contract.deliverables.push({ description: data.description, expectedDate: data.expectedDate, status: 'pending' });
    await contract.save();
    return contract;
  }

  async updateDeliverable(contractId, deliverableIndex, update, tenantId) {
    const contract = await Contract.findOne({ _id: contractId, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (contract.deliverables[deliverableIndex]) {
      Object.assign(contract.deliverables[deliverableIndex], update);
    }
    await contract.save();
    return contract;
  }

  async updatePerformanceMetrics(id, data, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (data.metrics) {
      contract.slaMetrics = data.metrics;
    }
    await contract.save();
    return contract;
  }

  async markPaymentPaid(id, paymentIdx, data, userId, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    const idx = parseInt(paymentIdx, 10);
    if (contract.paymentSchedule[idx]) {
      contract.paymentSchedule[idx].status = 'paid';
    }
    await contract.save();
    logger.audit('CONTRACT_PAYMENT_MARKED', userId, { contractId: contract._id, paymentIdx });
    return contract;
  }

  async getAuditLog(id, tenantId) {
    const contract = await Contract.findOne({ _id: id, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    // Return a summary of key events from signatures, variations, etc.
    const events = [];
    if (contract.createdAt) events.push({ action: 'CONTRACT_CREATED', date: contract.createdAt });
    contract.signatures.forEach(s => {
      events.push({ action: 'CONTRACT_SIGNED', date: s.signedAt, by: s.signatory, role: s.role });
    });
    contract.variations.forEach(v => {
      events.push({ action: 'VARIATION_ADDED', date: v.approvedAt || contract.updatedAt, description: v.description });
    });
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async getDeliveries(tenantId) {
    // Get all active/in-progress contracts with their deliverables
    const contracts = await Contract.find({ tenantId, status: { $in: ['active', 'in_progress'] } })
      .populate('vendorId', 'companyName')
      .sort('-createdAt');

    // Fetch all payments for these contracts to align GRN and 3-way match states
    const Payment = require('../models/payment.model');
    const payments = await Payment.find({
      tenantId,
      contractId: { $in: contracts.map(c => c._id) }
    });

    // Flatten deliverables into a delivery list
    const deliveries = [];
    contracts.forEach(c => {
      c.deliverables.forEach((d, i) => {
        let orderedQty = 1;
        const qtyMatch = d.description.match(/\((\d+)\s+units?\)/i);
        if (qtyMatch) {
          orderedQty = parseInt(qtyMatch[1], 10);
        }

        let grn = d.acceptanceReport && d.acceptanceReport.startsWith('GRN-') ? d.acceptanceReport : null;
        
        // Find corresponding payment by contract and GRN
        const associatedPayment = grn ? payments.find(p => 
          p.contractId.toString() === c._id.toString() && 
          p.goodsReceivedNote?.grnNumber === grn
        ) : null;

        let receivedQty = 0;
        let acceptedQty = 0;
        let matchStatus = 'pending';

        if (d.status === 'delivered' || d.status === 'accepted' || d.status === 'rejected') {
          if (!grn) {
            grn = `GRN-2026-0${i}5`;
          }

          if (associatedPayment) {
            // Retrieve quantities from the payment voucher's GRN items
            const grnItem = associatedPayment.goodsReceivedNote?.items?.find(item => 
              item.description.includes(d.description) || d.description.includes(item.description)
            ) || associatedPayment.goodsReceivedNote?.items?.[0];

            if (grnItem) {
              receivedQty = grnItem.receivedQty;
              acceptedQty = grnItem.acceptedQty;
            } else {
              receivedQty = orderedQty;
              acceptedQty = orderedQty;
            }

            // Sync match status
            if (associatedPayment.threeWayMatchStatus === 'discrepancy') {
              matchStatus = 'discrepancy';
            } else if (['matched', 'approved', 'paid'].includes(associatedPayment.threeWayMatchStatus) || 
                       ['approved', 'paid', 'pending_approval'].includes(associatedPayment.status)) {
              matchStatus = 'matched';
            } else {
              matchStatus = 'pending';
            }
          } else {
            // Fallback behavior if no payment matches yet
            if (d.status === 'accepted') {
              receivedQty = orderedQty;
              acceptedQty = orderedQty;
              matchStatus = 'matched';
            } else if (d.status === 'rejected') {
              receivedQty = Math.max(0, orderedQty - 2);
              acceptedQty = receivedQty;
              matchStatus = 'discrepancy';
            } else {
              receivedQty = orderedQty;
              acceptedQty = orderedQty;
              matchStatus = 'pending';
            }
          }
        }

        deliveries.push({
          _id: `${c._id}_${i}`,
          contractId: c._id,
          contract: c.contractNumber,
          po: c.contractNumber.replace('CNT-', 'PO-'),
          vendor: c.vendorId?.companyName || 'Unknown',
          items: d.description,
          deliveredDate: d.deliveredDate ? d.deliveredDate.toISOString().split('T')[0] : null,
          status: d.status,
          matchStatus,
          orderedQty,
          receivedQty,
          acceptedQty,
          grn,
          poAmount: c.contractValue,
          invoiceRef: grn ? grn.replace('GRN-', 'INV-') : null,
          invoiceAmount: c.contractValue,
        });
      });
    });
    return deliveries;
  }

  async recordGRN(contractDeliverableId, data, tenantId) {
    // contractDeliverableId is in format contractId_deliverableIndex
    const parts = contractDeliverableId.split('_');
    const contractId = parts[0];
    const deliverableIdx = parseInt(parts[1] || '0', 10);
    const contract = await Contract.findOne({ _id: contractId, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (contract.deliverables[deliverableIdx]) {
      contract.deliverables[deliverableIdx].deliveredDate = new Date();
      
      let orderedQty = 1;
      const qtyMatch = contract.deliverables[deliverableIdx].description.match(/\((\d+)\s+units?\)/i);
      if (qtyMatch) {
        orderedQty = parseInt(qtyMatch[1], 10);
      }
      
      const received = parseInt(data.receivedQty || orderedQty, 10);
      const accepted = parseInt(data.acceptedQty || received, 10);
      const isMatched = accepted === orderedQty;

      contract.deliverables[deliverableIdx].status = isMatched ? 'accepted' : 'rejected';
      contract.deliverables[deliverableIdx].acceptanceReport = data.grnRef || 'GRN recorded';

      // Automatically create a corresponding payment voucher in the database
      const Payment = require('../models/payment.model');
      const count = await Payment.countDocuments({ tenantId });
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      
      await Payment.create({
        tenantId,
        contractId: contract._id,
        procurementId: contract.procurementId,
        vendorId: contract.vendorId,
        paymentNumber,
        amount: contract.contractValue,
        paymentType: 'progress',
        status: isMatched ? 'pending_approval' : 'pending_match',
        threeWayMatchStatus: isMatched ? 'matched' : 'discrepancy',
        purchaseOrder: {
          poNumber: contract.contractNumber.replace('CNT-', 'PO-'),
          poDate: contract.startDate || new Date(),
          poAmount: contract.contractValue
        },
        goodsReceivedNote: {
          grnNumber: data.grnRef,
          grnDate: new Date(),
          items: [{
            description: contract.deliverables[deliverableIdx].description,
            orderedQty,
            receivedQty: received,
            acceptedQty: accepted,
            rejectedQty: Math.max(0, received - accepted)
          }]
        },
        invoice: {
          invoiceNumber: `INV-${data.grnRef.replace('GRN-', '')}`,
          invoiceDate: new Date(),
          invoiceAmount: contract.contractValue
        },
        deductions: [{ description: 'Retention (10%)', amount: contract.contractValue * 0.1, type: 'retention' }],
        netAmount: contract.contractValue * 0.9,
      });
    }
    await contract.save();
    return contract;
  }

  async resolveDiscrepancy(contractDeliverableId, tenantId) {
    const parts = contractDeliverableId.split('_');
    const contractId = parts[0];
    const deliverableIdx = parseInt(parts[1] || '0', 10);
    const contract = await Contract.findOne({ _id: contractId, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (contract.deliverables[deliverableIdx]) {
      contract.deliverables[deliverableIdx].status = 'accepted';
      
      // Update corresponding Payment status if it exists and has discrepancy
      const Payment = require('../models/payment.model');
      const payment = await Payment.findOne({ contractId, tenantId, status: 'pending_match' });
      if (payment) {
        payment.threeWayMatchStatus = 'matched';
        payment.status = 'pending_approval';
        payment.matchDiscrepancies = [];
        await payment.save();
      }
    }
    await contract.save();
    return contract;
  }

  async getExpiringContracts(tenantId, daysAhead = 30) {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return Contract.find({ tenantId, endDate: { $lte: futureDate }, status: 'active' }).populate('vendorId', 'companyName');
  }
}

module.exports = new ContractService();
