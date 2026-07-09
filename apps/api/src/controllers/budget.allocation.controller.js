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
    return created(res, allocation, 'Budget allocation created');
  } catch (err) { next(err); }
};

/** GET /api/budget-allocations — List allocations */
const getBudgetAllocations = async (req, res, next) => {
  try {
    const { budgetYear, faculty, department } = req.query;
    const filter = { tenantId: req.tenantId };
    if (budgetYear) filter.budgetYear = Number(budgetYear);

    const allocations = await BudgetAllocation.find(filter)
      .populate('distributedBy', 'name email')
      .populate('verifiedByBursar', 'name email')
      .sort({ budgetYear: -1 });

    // Filter by faculty/dept if scoped role
    let result = allocations.map(a => a.toJSON());
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
    const allocation = await BudgetAllocation.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('distributedBy', 'name email')
      .populate('annualPlanId', 'title planYear referenceNumber');
    if (!allocation) return res.status(404).json({ message: 'Budget Allocation not found' });
    return success(res, allocation);
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
    if (req.user.role === 'bursar' || (req.user.role === 'super_admin' && next_status === 'bursar_confirmed')) {
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

/** GET /api/budget-allocations/my-budget — Get budget for the current user's department */
const getMyBudget = async (req, res, next) => {
  try {
    const userDept = req.user.department;
    const userFaculty = req.user.faculty;
    const currentYear = new Date().getFullYear();
    const allocations = await BudgetAllocation.find({ tenantId: req.tenantId, budgetYear: currentYear });
    let myAlloc = null;
    for (const alloc of allocations) {
      const deptEntry = alloc.departmentAllocations.find(d => {
        if (userDept && userFaculty) {
          return d.department === userDept && d.faculty === userFaculty;
        }
        if (userDept) return d.department === userDept;
        if (userFaculty) return d.faculty === userFaculty;
        return false;
      });
      if (deptEntry) { myAlloc = { ...deptEntry.toJSON(), allocationId: alloc._id }; break; }
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
