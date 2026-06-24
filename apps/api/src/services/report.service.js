/**
 * Report Service
 */
const Report = require('../models/report.model');
const Procurement = require('../models/procurement.model');
const Contract = require('../models/contract.model');
const Payment = require('../models/payment.model');
const Vendor = require('../models/vendor.model');
const logger = require('../config/logger');

class ReportService {
  async generateProcurementPerformance(tenantId, period) {
    const filters = { tenantId };
    if (period.startDate) filters.createdAt = { $gte: period.startDate, $lte: period.endDate };
    
    const [procurements, contracts, payments, vendors] = await Promise.all([
      Procurement.aggregate([{ $match: filters }, { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$totalEstimatedCost' } } }]),
      Contract.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$contractValue' } } }]),
      Payment.aggregate([{ $match: { tenantId, status: 'paid' } }, { $group: { _id: null, totalPaid: { $sum: '$netAmount' }, count: { $sum: 1 } } }]),
      Vendor.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const report = await Report.create({ tenantId, reportType: 'procurement_performance', title: `Procurement Performance Report - ${period.year || new Date().getFullYear()}`, period, data: { procurements, contracts, payments, vendors }, status: 'ready' });
    return report;
  }

  async getAll(query, tenantId) {
    const filters = { tenantId };
    if (query.reportType) filters.reportType = query.reportType;
    return Report.find(filters).sort('-createdAt').limit(50).populate('generatedBy', 'firstName lastName');
  }

  async getById(id, tenantId) {
    return Report.findOne({ _id: id, tenantId }).populate('generatedBy', 'firstName lastName');
  }

  async getSpendAnalysis(tenantId) {
    const byDepartment = await Procurement.aggregate([{ $match: { tenantId, status: { $ne: 'cancelled' } } }, { $group: { _id: '$department', totalSpend: { $sum: '$totalEstimatedCost' }, count: { $sum: 1 } } }, { $sort: { totalSpend: -1 } }]);
    const byCategory = await Procurement.aggregate([{ $match: { tenantId, status: { $ne: 'cancelled' } } }, { $group: { _id: '$category', totalSpend: { $sum: '$totalEstimatedCost' }, count: { $sum: 1 } } }]);
    const monthlyTrend = await Procurement.aggregate([{ $match: { tenantId } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, totalSpend: { $sum: '$totalEstimatedCost' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]);
    return { byDepartment, byCategory, monthlyTrend };
  }
}

module.exports = new ReportService();
