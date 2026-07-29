/**
 * Budget Allocation Controller
 * Phase 4: Internal Budget Distribution
 * VC → Finance Committee → Bursar → Dean → HOD
 */
const BudgetAllocation = require('../models/budget.allocation.model');
const AnnualPlan = require('../models/annual.plan.model');
const { success, created } = require('../utils/response');

/** POST /api/budget-allocations — Create and distribute budget */
const createBudgetAllocation = async (req, res, next) => {
  try {
    const allocation = new BudgetAllocation({
      ...req.body,
      tenantId: req.tenantId,
      distributedBy: req.user._id,
      distributedAt: new Date(),
    });
    await allocation.save();

    // Sync status of linked AnnualPlan if provided
    if (allocation.annualPlanId) {
      await AnnualPlan.findByIdAndUpdate(allocation.annualPlanId, {
        $addToSet: { budgetAllocationIds: allocation._id },
        status: 'distribution_in_progress',
      });
    }

    return created(res, allocation, 'Budget allocation created successfully');
  } catch (err) { next(err); }
};

const syncBudgetAllocationConsumed = async (tenantId, allocations) => {
  try {
    const Procurement = require('../models/procurement.model');
    const procs = await Procurement.find({
      tenantId,
      status: { $nin: ['rejected', 'cancelled'] },
    }).lean();

    if (!procs || procs.length === 0) return allocations.map(a => (a.toJSON ? a.toJSON() : a));

    return allocations.map(allocDoc => {
      const alloc = allocDoc.toJSON ? allocDoc.toJSON() : JSON.parse(JSON.stringify(allocDoc));
      if (Array.isArray(alloc.departmentAllocations)) {
        alloc.departmentAllocations = alloc.departmentAllocations.map(d => {
          const cleanDDept = (d.department || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();
          const cleanDFac = (d.faculty || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();

          const matchingProcs = procs.filter(p => {
            const pDept = (p.department || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();
            const pFac = (p.faculty || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();

            const nameMatch = (cleanDDept && pDept && (cleanDDept.includes(pDept) || pDept.includes(cleanDDept) || cleanDFac.includes(pDept))) ||
                              (cleanDFac && pFac && (cleanDFac.includes(pFac) || pFac.includes(cleanDFac) || cleanDDept.includes(pFac))) ||
                              (cleanDDept && pFac && (cleanDDept.includes(pFac) || pFac.includes(cleanDDept))) ||
                              (cleanDFac && pDept && (cleanDFac.includes(pDept) || pDept.includes(cleanDFac)));

            return nameMatch;
          });

          const sumProcCost = matchingProcs.reduce((sum, p) => {
            const cost = p.totalEstimatedCost || (p.items?.reduce((isum, item) => isum + (item.estimatedTotalPrice || (item.quantity * item.estimatedUnitPrice) || 0), 0)) || 0;
            return sum + cost;
          }, 0);

          const consumedAmount = Math.max(d.consumedAmount || 0, sumProcCost);
          const remainingAmount = Math.max(0, (d.allocatedAmount || 0) - consumedAmount);
          return {
            ...d,
            consumedAmount,
            remainingAmount,
          };
        });

        alloc.totalConsumed = alloc.departmentAllocations.reduce((sum, d) => sum + (d.consumedAmount || 0), 0);
        alloc.totalRemaining = Math.max(0, (alloc.procurementBudget || alloc.totalAllocated || 0) - alloc.totalConsumed);
      }
      return alloc;
    });
  } catch (err) {
    console.error('Error syncing budget allocation consumed amounts:', err);
    return allocations.map(a => (a.toJSON ? a.toJSON() : a));
  }
};

/** GET /api/budget-allocations — List allocations */
const getBudgetAllocations = async (req, res, next) => {
  try {
    const { budgetYear, faculty, department } = req.query;
    const filter = { tenantId: req.tenantId };
    if (budgetYear) filter.budgetYear = Number(budgetYear);

    const rawAllocations = await BudgetAllocation.find(filter)
      .populate('distributedBy', 'name email')
      .populate('verifiedByBursar', 'name email')
      .populate('annualPlanId', 'title planYear referenceNumber totalBudgetRequest status')
      .sort({ budgetYear: -1 });

    const allocations = await syncBudgetAllocationConsumed(req.tenantId, rawAllocations);

    // Filter by faculty/dept if scoped role
    let result = allocations;
    if (faculty) {
      result = result.map(a => ({
        ...a,
        departmentAllocations: a.departmentAllocations.filter(d => d.faculty === faculty),
      }));
    }
    if (department) {
      result = result.map(a => ({
        ...a,
        departmentAllocations: a.departmentAllocations.filter(d => d.department === department),
      }));
    }
    return success(res, result);
  } catch (err) { next(err); }
};

/** GET /api/budget-allocations/:id — Get single allocation */
const getBudgetAllocation = async (req, res, next) => {
  try {
    const rawAllocation = await BudgetAllocation.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('distributedBy', 'name email')
      .populate('annualPlanId', 'title planYear referenceNumber totalBudgetRequest status');
    if (!rawAllocation) return res.status(404).json({ message: 'Budget Allocation not found' });
    const synced = await syncBudgetAllocationConsumed(req.tenantId, [rawAllocation]);
    return success(res, synced[0] || rawAllocation);
  } catch (err) { next(err); }
};

/** PUT /api/budget-allocations/:id/advance — Advance distribution status */
const advanceDistribution = async (req, res, next) => {
  try {
    const allocation = await BudgetAllocation.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!allocation) return res.status(404).json({ message: 'Budget Allocation not found' });
    const transitions = {
      vc_distributed: 'finance_committee_verified',
      finance_committee_verified: 'bursar_confirmed',
      bursar_confirmed: 'dean_notified',
      dean_notified: 'hod_notified',
      hod_notified: 'complete',
    };
    const next_status = transitions[allocation.distributionStatus];
    if (!next_status) return res.status(400).json({ message: 'Already at final distribution stage' });
    allocation.distributionStatus = next_status;
    if (req.user.role === 'bursar' || (['super_admin', 'admin', 'vc'].includes(req.user.role) && next_status === 'bursar_confirmed')) {
      allocation.verifiedByBursar = req.user._id;
      allocation.verifiedAt = new Date();
    }
    await allocation.save();

    // ── Phase 4 completion: Update linked Annual Plan ──
    if (next_status === 'complete' && allocation.annualPlanId) {
      await AnnualPlan.findByIdAndUpdate(allocation.annualPlanId, {
        status: 'distribution_complete',
      });
    }

    return success(res, allocation, `Status advanced to: ${next_status}`);
  } catch (err) { next(err); }
};

/** GET /api/budget-allocations/my-budget — Get budget for the current user's department or queried faculty */
const getMyBudget = async (req, res, next) => {
  try {
    const userDept = req.query.department || req.user?.department;
    const userFaculty = req.query.faculty || req.user?.faculty;
    const currentYear = new Date().getFullYear();

    let rawAllocations = await BudgetAllocation.find({ tenantId: req.tenantId, budgetYear: currentYear });
    if (!rawAllocations || rawAllocations.length === 0) {
      rawAllocations = await BudgetAllocation.find({ tenantId: req.tenantId }).sort({ budgetYear: -1 });
    }

    const allocations = await syncBudgetAllocationConsumed(req.tenantId, rawAllocations);

    const FACULTY_MAP = {
      fom: 'Faculty of Medicine',
      fots: 'Faculty of Technological Studies',
      foas: 'Faculty of Applied Sciences',
      foahs: 'Faculty of Animal Science & Export Agriculture',
      'fom-mgt': 'Faculty of Management',
      supplies: 'Supplies Division',
      works: 'Works Division',
      'vc-office': "Vice Chancellor's Office",
      'admin-building': 'Administration Building',
      'exam-division': 'Examination Division',
      'student-affairs': 'Student Affairs Division',
      library: 'Library',
      'main-canteen': 'Main Canteen (Samajaya)',
      'gallery-canteen': 'Gallery Canteen',
      'g-canteen': 'G Canteen',
      'sports-unit': 'Sports & Physical Education Unit',
      hostels: 'Hostels',
      'security-unit': 'Security Unit',
    };

    const targetFacLabel = userFaculty ? (FACULTY_MAP[userFaculty] || userFaculty) : '';
    const targetDeptLabel = userDept || '';

    let myAlloc = null;
    for (const alloc of allocations) {
      const deptEntry = alloc.departmentAllocations?.find(d => {
        const facMatch = userFaculty ? (
          (d.faculty && d.faculty.toLowerCase() === userFaculty.toLowerCase()) ||
          (d.faculty && targetFacLabel && d.faculty.toLowerCase() === targetFacLabel.toLowerCase()) ||
          (d.faculty && targetFacLabel && (d.faculty.toLowerCase().includes(targetFacLabel.toLowerCase()) || targetFacLabel.toLowerCase().includes(d.faculty.toLowerCase())))
        ) : true;

        const deptMatch = userDept ? (
          (d.department && d.department.toLowerCase() === targetDeptLabel.toLowerCase()) ||
          (d.department && (d.department.toLowerCase().includes(targetDeptLabel.toLowerCase()) || targetDeptLabel.toLowerCase().includes(d.department.toLowerCase())))
        ) : true;

        if (userFaculty && userDept) return facMatch && deptMatch;
        if (userFaculty) return facMatch;
        if (userDept) return deptMatch;
        return false;
      });

      if (deptEntry) {
        const remaining = (deptEntry.allocatedAmount || 0) - (deptEntry.consumedAmount || 0);
        myAlloc = {
          ...deptEntry,
          remainingAmount: deptEntry.remainingAmount !== undefined && deptEntry.remainingAmount !== null ? deptEntry.remainingAmount : remaining,
          allocationId: alloc._id
        };
        break;
      }
    }

    if (!myAlloc && allocations.length > 0) {
      const firstAlloc = allocations[0];
      const sumAllocated = firstAlloc.totalAllocated || firstAlloc.procurementBudget || firstAlloc.totalUniversityBudget || 0;
      const sumConsumed = firstAlloc.totalConsumed || 0;
      myAlloc = {
        allocatedAmount: sumAllocated,
        consumedAmount: sumConsumed,
        remainingAmount: sumAllocated - sumConsumed,
        allocationId: firstAlloc._id,
      };
    }

    return success(res, myAlloc || { allocatedAmount: 0, consumedAmount: 0, remainingAmount: 0 });
  } catch (err) { next(err); }
};

/** POST /api/budget-allocations/:id/consume — Deduct from department budget when procurement is created */
const consumeBudget = async (req, res, next) => {
  try {
    const { department, faculty, amount } = req.body;
    if (!department || !amount) return res.status(400).json({ message: 'department and amount are required' });

    const allocation = await BudgetAllocation.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!allocation) return res.status(404).json({ message: 'Budget Allocation not found' });

    const deptAlloc = allocation.departmentAllocations.find(
      d => d.department === department && (!faculty || d.faculty === faculty)
    );
    if (!deptAlloc) return res.status(404).json({ message: 'Department allocation not found' });

    const remaining = (deptAlloc.allocatedAmount || 0) - (deptAlloc.consumedAmount || 0);
    if (amount > remaining) {
      return res.status(400).json({
        message: `Insufficient budget. Available: LKR ${remaining.toLocaleString()}, Requested: LKR ${amount.toLocaleString()}`,
      });
    }

    deptAlloc.consumedAmount = (deptAlloc.consumedAmount || 0) + amount;
    if (deptAlloc.consumedAmount >= deptAlloc.allocatedAmount) deptAlloc.status = 'exhausted';

    await allocation.save();
    return success(res, {
      consumed: amount,
      remainingBudget: (deptAlloc.allocatedAmount || 0) - deptAlloc.consumedAmount,
    }, 'Budget consumed successfully');
  } catch (err) { next(err); }
};

/** POST /api/budget-allocations/:id/release — Return budget when procurement is cancelled */
const releaseBudget = async (req, res, next) => {
  try {
    const { department, faculty, amount } = req.body;
    if (!department || !amount) return res.status(400).json({ message: 'department and amount are required' });

    const allocation = await BudgetAllocation.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!allocation) return res.status(404).json({ message: 'Budget Allocation not found' });

    const deptAlloc = allocation.departmentAllocations.find(
      d => d.department === department && (!faculty || d.faculty === faculty)
    );
    if (!deptAlloc) return res.status(404).json({ message: 'Department allocation not found' });

    deptAlloc.consumedAmount = Math.max(0, (deptAlloc.consumedAmount || 0) - amount);
    if (deptAlloc.consumedAmount < deptAlloc.allocatedAmount) deptAlloc.status = 'active';

    await allocation.save();
    return success(res, {
      released: amount,
      remainingBudget: (deptAlloc.allocatedAmount || 0) - deptAlloc.consumedAmount,
    }, 'Budget released successfully');
  } catch (err) { next(err); }
};

module.exports = { createBudgetAllocation, getBudgetAllocations, getBudgetAllocation, advanceDistribution, getMyBudget, consumeBudget, releaseBudget };
