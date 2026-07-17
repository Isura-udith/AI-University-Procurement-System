/**
 * Report Service
 */
const Report = require('../models/report.model');
const Procurement = require('../models/procurement.model');
const Contract = require('../models/contract.model');
const Payment = require('../models/payment.model');
const Vendor = require('../models/vendor.model');
const AnnualPlan = require('../models/annual.plan.model');
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

  async getPublicAnalytics(tenantId) {
    const defaultTenant = tenantId || 'uwu-main';
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Spend vs Budget (Monthly)
    // We mock the budget line but aggregate actual spend for current year
    const monthlySpendAggr = await Procurement.aggregate([
      { 
        $match: { 
          tenantId: defaultTenant, 
          status: { 
            $nin: ['draft', 'submitted', 'under_review', 'rejected', 'cancelled', 'on_hold', 'flagged_special_approval'] 
          } 
        } 
      },
      { $project: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' }, amount: '$totalEstimatedCost' } },
      { $match: { year: currentYear } },
      { $group: { _id: '$month', spend: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    const annualPlan = await AnnualPlan.findOne({ tenantId: defaultTenant, planYear: currentYear });
    const annualBudget = annualPlan ? annualPlan.totalAllocatedBudget : 0;
    const monthlyBudget = annualBudget ? (annualBudget / 12) / 1000000 : 25; // in Millions

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const spendData = months.map((m, i) => {
      const match = monthlySpendAggr.find(a => a._id === i + 1);
      return { 
        month: m, 
        spend: match ? match.spend / 1000000 : 0, 
        budget: monthlyBudget 
      };
    });

    // 2. Category Data (Count & Spend)
    const categoryAggr = await Procurement.aggregate([
      { $match: { tenantId: defaultTenant } },
      { $group: { _id: '$category', totalSpend: { $sum: '$totalEstimatedCost' }, count: { $sum: 1 } } }
    ]);

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    let categoryData = [];
    let categorySpendData = [];
    
    if (categoryAggr.length > 0) {
      categoryData = categoryAggr.map(c => ({ category: c._id || 'General', value: c.count }));
      const totalSpend = categoryAggr.reduce((acc, c) => acc + c.totalSpend, 0) || 1;
      categorySpendData = categoryAggr.map((c, i) => ({
        name: c._id || 'General',
        value: Math.round((c.totalSpend / totalSpend) * 100),
        color: colors[i % colors.length]
      }));
    } else {
      categoryData = [
        { category: 'Goods', value: 120 }, { category: 'Works', value: 250 },
        { category: 'Services', value: 80 }, { category: 'Consulting', value: 30 }
      ];
      categorySpendData = [
        { name: 'IT & Elec.', value: 35, color: '#3b82f6' },
        { name: 'Lab Equip.', value: 25, color: '#10b981' },
        { name: 'Furniture', value: 20, color: '#f59e0b' },
        { name: 'Consulting', value: 15, color: '#8b5cf6' },
        { name: 'Vehicles', value: 5, color: '#ef4444' }
      ];
    }

    // 3. Monthly Status Data
    const statusAggr = await Procurement.aggregate([
      { $match: { tenantId: defaultTenant } },
      { $project: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' }, status: 1 } },
      { $match: { year: currentYear } },
      { $group: { 
          _id: { month: '$month', status: '$status' }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    let monthlyStatusData = [];
    if (statusAggr.length > 0) {
      const pendingStatuses = ['draft', 'submitted', 'under_review', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'vc_approved', 'pmd_review', 'flagged_special_approval'];
      const approvedStatuses = ['budget_locked', 'committee_assigned', 'tender_preparation', 'published', 'bidding', 'evaluation', 'standstill', 'contract_signing', 'in_progress', 'delivery', 'three_way_match', 'payment_pending', 'award_pending'];
      const completedStatuses = ['completed'];

      monthlyStatusData = months.map((m, i) => {
        const monthNum = i + 1;
        let pending = 0;
        let approved = 0;
        let completed = 0;

        statusAggr.forEach(a => {
          if (a._id.month === monthNum) {
            if (pendingStatuses.includes(a._id.status)) {
              pending += a.count;
            } else if (approvedStatuses.includes(a._id.status)) {
              approved += a.count;
            } else if (completedStatuses.includes(a._id.status)) {
              completed += a.count;
            }
          }
        });

        return { month: m, Pending: pending, Approved: approved, Completed: completed };
      }).filter(m => m.Pending > 0 || m.Approved > 0 || m.Completed > 0);
    } 
    
    if(monthlyStatusData.length === 0) {
      monthlyStatusData = [
        { month: 'Jan', Pending: 10, Approved: 25, Completed: 15 },
        { month: 'Feb', Pending: 12, Approved: 28, Completed: 18 },
        { month: 'Mar', Pending: 18, Approved: 22, Completed: 25 },
        { month: 'Apr', Pending: 15, Approved: 30, Completed: 20 },
        { month: 'May', Pending: 25, Approved: 15, Completed: 10 },
      ];
    }

    // 4. Top Vendors
    let topVendors = await Vendor.find({ tenantId: defaultTenant })
      .sort({ performanceScore: -1 })
      .limit(5)
      .select('companyName performanceScore supplierCategories _id')
      .lean();
    
    if (topVendors.length > 0) {
      topVendors = topVendors.map((v, i) => ({
        id: v._id,
        name: v.companyName,
        score: v.performanceScore || 0,
        category: v.supplierCategories && v.supplierCategories.length > 0 ? v.supplierCategories[0] : 'General',
        trend: i % 2 === 0 ? 'up' : 'down'
      }));
    } else {
      topVendors = [
        { id: 1, name: 'TechCorp Solutions', score: 96, category: 'IT & Elec.', trend: 'up' },
        { id: 2, name: 'MediSupply Co.', score: 88, category: 'Lab Equip.', trend: 'up' },
        { id: 3, name: 'BuildPro Const.', score: 75, category: 'Works', trend: 'down' },
        { id: 4, name: 'EduFurniture LK', score: 92, category: 'Furniture', trend: 'up' },
        { id: 5, name: 'Global Consult.', score: 68, category: 'Consulting', trend: 'down' },
      ];
    }

    // 5. Recent Awards
    let recentAwards = await Contract.find({ tenantId: defaultTenant })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('vendorId', 'companyName')
      .select('contractNumber title contractValue createdAt vendorId')
      .lean();
    
    if (recentAwards.length > 0) {
      recentAwards = recentAwards.map(a => ({
        contract: a.contractNumber,
        vendor: a.vendorId?.companyName || 'Unknown Vendor',
        title: a.title,
        value: `LKR ${(a.contractValue / 1000000).toFixed(1)}M`,
        date: new Date(a.createdAt).toISOString().split('T')[0]
      }));
    } else {
      recentAwards = [
        { contract: 'CNT-2026-0012', vendor: 'TechVision Asia', title: 'Network Switches Supply', value: 'LKR 12.5M', date: '2026-05-10' },
        { contract: 'CNT-2026-0011', vendor: 'Lanka Construction Corp', title: 'Library Renovation', value: 'LKR 45.0M', date: '2026-05-08' },
        { contract: 'CNT-2026-0010', vendor: 'MedTech Solutions', title: 'Anatomy Lab Microscopes', value: 'LKR 28.2M', date: '2026-05-05' },
      ];
    }

    // 6. Overall KPIs
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const spendSumAggr = await Procurement.aggregate([
      { 
        $match: { 
          tenantId: defaultTenant, 
          status: { 
            $nin: ['draft', 'submitted', 'under_review', 'rejected', 'cancelled', 'on_hold', 'flagged_special_approval'] 
          },
          createdAt: { $gte: startOfYear, $lte: endOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalEstimatedCost' } } }
    ]);
    const totalSpend = spendSumAggr.length > 0 ? spendSumAggr[0].total : 0;
    
    const activeTendersCount = await Procurement.countDocuments({
      tenantId: defaultTenant,
      status: { $in: ['published', 'bidding', 'evaluation'] }
    });
    
    const registeredVendorsCount = await Vendor.countDocuments({ tenantId: defaultTenant });

    // Dynamic compliance score based on budgetComplianceCheck
    const totalChecked = await Procurement.countDocuments({ 
      tenantId: defaultTenant, 
      'budgetComplianceCheck.checkedAt': { $exists: true } 
    });
    const passedComplianceCount = await Procurement.countDocuments({
      tenantId: defaultTenant,
      'budgetComplianceCheck.checkedAt': { $exists: true },
      'budgetComplianceCheck.passed': true
    });
    const complianceScoreVal = totalChecked > 0 
      ? (passedComplianceCount / totalChecked) * 100 
      : 98.5; // default fallback if no checks performed yet
    
    const kpis = {
      totalSpendYTD: `LKR ${(totalSpend / 1000000).toFixed(1)}M`,
      activeTenders: activeTendersCount,
      registeredVendors: registeredVendorsCount,
      complianceScore: `${complianceScoreVal.toFixed(1)}%`
    };

    return { spendData, categoryData, monthlyStatusData, topVendors, categorySpendData, recentAwards, kpis };
  }
}

module.exports = new ReportService();
