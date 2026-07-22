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

  async updateDeliverable(contractId, deliverableIdOrIndex, update, tenantId) {
    const contract = await Contract.findOne({ _id: contractId, tenantId });
    if (!contract) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    
    let deliverable;
    if (/^\d+$/.test(deliverableIdOrIndex)) {
      deliverable = contract.deliverables[parseInt(deliverableIdOrIndex, 10)];
    } else {
      deliverable = contract.deliverables.id(deliverableIdOrIndex);
    }

    if (!deliverable) throw Object.assign(new Error('Deliverable not found'), { statusCode: 404 });
    
    Object.assign(deliverable, update);
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
    // Get all active, in-progress, loa_issued, or completed contracts with deliverables
    const contracts = await Contract.find({ tenantId, status: { $in: ['active', 'in_progress', 'loa_issued', 'completed'] } })
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
      (c.deliverables || []).forEach((d, i) => {
        let orderedQty = 1;
        const qtyMatch = d.description ? d.description.match(/\((\d+)\s+units?\)/i) : null;
        if (qtyMatch) {
          orderedQty = parseInt(qtyMatch[1], 10);
        }

        let grn = d.acceptanceReport && d.acceptanceReport.startsWith('GRN-') ? d.acceptanceReport : null;
        
        // Find corresponding payment by contract and GRN (or contract fallback)
        const associatedPayment = payments.find(p => 
          p.contractId.toString() === c._id.toString() && 
          ((grn && p.goodsReceivedNote?.grnNumber === grn) || !grn)
        );

        if (!grn && associatedPayment?.goodsReceivedNote?.grnNumber) {
          grn = associatedPayment.goodsReceivedNote.grnNumber;
        }

        let receivedQty = 0;
        let acceptedQty = 0;
        let matchStatus = 'pending';

        if (d.status === 'delivered' || d.status === 'accepted' || d.status === 'rejected') {
          if (!grn) {
            grn = `GRN-2026-0${i + 1}5`;
          }

          if (associatedPayment) {
            const grnItem = associatedPayment.goodsReceivedNote?.items?.find(item => 
              item.description && (item.description.includes(d.description) || d.description.includes(item.description))
            ) || associatedPayment.goodsReceivedNote?.items?.[0];

            if (grnItem) {
              receivedQty = grnItem.receivedQty ?? orderedQty;
              acceptedQty = grnItem.acceptedQty ?? orderedQty;
            } else {
              receivedQty = orderedQty;
              acceptedQty = orderedQty;
            }

            if (d.status === 'accepted' || ['matched', 'approved', 'paid'].includes(associatedPayment.threeWayMatchStatus) || ['approved', 'paid', 'pending_approval'].includes(associatedPayment.status)) {
              matchStatus = 'matched';
            } else if (associatedPayment.threeWayMatchStatus === 'discrepancy' || d.status === 'rejected' || (receivedQty > 0 && (receivedQty !== orderedQty || acceptedQty !== orderedQty))) {
              matchStatus = 'discrepancy';
            } else {
              matchStatus = 'pending';
            }
          } else {
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
          po: c.contractNumber ? c.contractNumber.replace('CNT-', 'PO-') : `PO-${c._id.toString().slice(-4)}`,
          vendor: c.vendorId?.companyName || 'Unknown Vendor',
          items: d.description || 'Deliverable Item',
          deliveredDate: d.deliveredDate ? new Date(d.deliveredDate).toISOString().split('T')[0] : null,
          status: d.status || 'pending',
          matchStatus,
          orderedQty,
          receivedQty,
          acceptedQty,
          grn,
          poAmount: c.contractValue || 0,
          invoiceRef: grn ? grn.replace('GRN-', 'INV-') : (associatedPayment?.invoice?.invoiceNumber || null),
          invoiceAmount: associatedPayment?.invoice?.invoiceAmount || c.contractValue || 0,
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
    if (!contract) throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    if (contract.deliverables && contract.deliverables[deliverableIdx]) {
      contract.deliverables[deliverableIdx].deliveredDate = new Date();
      
      let orderedQty = 1;
      const desc = contract.deliverables[deliverableIdx].description || '';
      const qtyMatch = desc.match(/\((\d+)\s+units?\)/i);
      if (qtyMatch) {
        orderedQty = parseInt(qtyMatch[1], 10);
      } else if (data.orderedQty) {
        orderedQty = parseInt(data.orderedQty, 10);
      }
      
      const received = parseInt(data.receivedQty || orderedQty, 10);
      const accepted = parseInt(data.acceptedQty || received, 10);
      const isMatched = (received === orderedQty) && (accepted === orderedQty) && (data.condition === 'good' || !data.condition);

      const grnRefVal = data.grnRef || `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      contract.deliverables[deliverableIdx].status = isMatched ? 'accepted' : 'rejected';
      contract.deliverables[deliverableIdx].acceptanceReport = grnRefVal;

      const Payment = require('../models/payment.model');
      let existingPayment = await Payment.findOne({
        tenantId,
        contractId: contract._id,
        $or: [
          { 'goodsReceivedNote.grnNumber': grnRefVal },
          { status: 'pending_match' }
        ]
      });

      const matchDiscrepancies = [];
      if (!isMatched) {
        if (received !== orderedQty) {
          matchDiscrepancies.push({
            field: 'quantity_received',
            poValue: `${orderedQty} units`,
            grnValue: `${received} units`,
            invoiceValue: `${orderedQty} units`,
            resolution: 'Pending store manager & vendor resolution'
          });
        }
        if (accepted !== received) {
          matchDiscrepancies.push({
            field: 'quantity_accepted',
            poValue: `${received} units received`,
            grnValue: `${accepted} units accepted`,
            invoiceValue: `${received} units`,
            resolution: 'Rejection/debit note required'
          });
        }
        if (data.condition && data.condition !== 'good') {
          matchDiscrepancies.push({
            field: 'item_condition',
            poValue: 'Good Condition',
            grnValue: `Condition: ${data.condition}`,
            invoiceValue: 'Good Condition',
            resolution: `Inspection noted: ${data.remarks || data.condition}`
          });
        }
      }

      if (existingPayment) {
        existingPayment.goodsReceivedNote = {
          grnNumber: grnRefVal,
          grnDate: new Date(),
          items: [{
            description: desc,
            orderedQty,
            receivedQty: received,
            acceptedQty: accepted,
            rejectedQty: Math.max(0, received - accepted),
            reason: data.remarks || ''
          }]
        };
        existingPayment.threeWayMatchStatus = isMatched ? 'matched' : 'discrepancy';
        existingPayment.status = isMatched ? 'pending_approval' : 'pending_match';
        existingPayment.matchDiscrepancies = matchDiscrepancies;
        await existingPayment.save();
      } else {
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
          matchDiscrepancies,
          purchaseOrder: {
            poNumber: contract.contractNumber ? contract.contractNumber.replace('CNT-', 'PO-') : `PO-${contract._id.toString().slice(-4)}`,
            poDate: contract.startDate || new Date(),
            poAmount: contract.contractValue
          },
          goodsReceivedNote: {
            grnNumber: grnRefVal,
            grnDate: new Date(),
            items: [{
              description: desc,
              orderedQty,
              receivedQty: received,
              acceptedQty: accepted,
              rejectedQty: Math.max(0, received - accepted),
              reason: data.remarks || ''
            }]
          },
          invoice: {
            invoiceNumber: `INV-${grnRefVal.replace('GRN-', '')}`,
            invoiceDate: new Date(),
            invoiceAmount: contract.contractValue
          },
          deductions: [{ description: 'Retention (10%)', amount: contract.contractValue * 0.1, type: 'retention' }],
          netAmount: contract.contractValue * 0.9,
        });
      }

      // Trigger goodsAccepted notification if matched
      if (isMatched) {
        const Vendor = require('../models/vendor.model');
        const User = require('../models/user.model');
        const triggers = require('./workflow.triggers');
        try {
          const vendor = await Vendor.findById(contract.vendorId);
          if (vendor && vendor.userId) {
            const supplierUser = await User.findById(vendor.userId);
            if (supplierUser) {
              await triggers.goodsAccepted(tenantId, {
                poNumber: contract.contractNumber ? contract.contractNumber.replace('CNT-', 'PO-') : 'PO',
                grnNumber: grnRefVal,
                _id: contract._id,
              }, supplierUser);
            }
          }
        } catch (err) {
          logger.error('Failed to trigger goodsAccepted notification', err);
        }
      }
    }
    await contract.save();
    return contract;
  }

  async resolveDiscrepancy(contractDeliverableId, tenantId) {
    const parts = contractDeliverableId.split('_');
    const contractId = parts[0];
    const deliverableIdx = parseInt(parts[1] || '0', 10);
    const contract = await Contract.findOne({ _id: contractId, tenantId });
    if (!contract) throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    if (contract.deliverables && contract.deliverables[deliverableIdx]) {
      contract.deliverables[deliverableIdx].status = 'accepted';
      
      const Payment = require('../models/payment.model');
      const payment = await Payment.findOne({
        contractId,
        tenantId,
        $or: [
          { status: 'pending_match' },
          { threeWayMatchStatus: 'discrepancy' }
        ]
      });

      if (payment) {
        payment.threeWayMatchStatus = 'matched';
        payment.status = 'pending_approval';
        payment.matchDiscrepancies = [];
        if (payment.goodsReceivedNote && payment.goodsReceivedNote.items && payment.goodsReceivedNote.items.length > 0) {
          payment.goodsReceivedNote.items.forEach(item => {
            item.acceptedQty = item.orderedQty || item.receivedQty;
            item.rejectedQty = 0;
          });
        }
        await payment.save();
      }

      // Trigger goodsAccepted notification
      const Vendor = require('../models/vendor.model');
      const User = require('../models/user.model');
      const triggers = require('./workflow.triggers');
      try {
        const vendor = await Vendor.findById(contract.vendorId);
        if (vendor && vendor.userId) {
          const supplierUser = await User.findById(vendor.userId);
          if (supplierUser) {
            await triggers.goodsAccepted(tenantId, {
              poNumber: contract.contractNumber ? contract.contractNumber.replace('CNT-', 'PO-') : 'PO',
              grnNumber: payment?.goodsReceivedNote?.grnNumber || contract.deliverables[deliverableIdx].acceptanceReport || 'GRN recorded',
              _id: contract._id,
            }, supplierUser);
          }
        }
      } catch (err) {
        logger.error('Failed to trigger goodsAccepted notification', err);
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
