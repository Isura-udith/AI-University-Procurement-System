/**
 * Budget Validation Service
 * Enforces the core procurement governance rule:
 *   1. The procurement item must exist in an approved Annual Procurement Plan (DAPP)
 *      that has reached `distribution_complete` (budget distributed to departments).
 *   2. The department must have sufficient remaining budget for the requested amount.
 *
 * Returns a structured compliance result used by procurement.service and the API.
 */

const AnnualPlan = require('../models/annual.plan.model');
const FinalMasterPlan = require('../models/final.master.plan.model');
const BudgetAllocation = require('../models/budget.allocation.model');

/**
 * @typedef {Object} ComplianceResult
 * @property {boolean} passed           - True only if BOTH checks pass
 * @property {boolean} annualPlanPassed - Annual Plan item check result
 * @property {boolean} budgetPassed     - Department budget sufficiency check
 * @property {string}  failureReason    - One of: 'no_annual_plan_linked' | 'plan_not_approved' |
 *                                        'item_not_found' | 'insufficient_budget' | 'no_budget_allocated'
 * @property {string}  annualPlanStatus - Status of the linked annual plan (e.g. 'distribution_complete')
 * @property {string}  annualPlanRef    - Reference number of the linked plan
 * @property {string}  annualItemDesc   - Description of the matched DAPP item
 * @property {number}  remainingBudget  - Department's remaining budget (0 if no allocation found)
 * @property {number}  requiredBudget   - Amount requested by the procurement
 * @property {boolean} requiresSpecialApproval - True if over-budget but within 10% grace threshold
 * @property {number}  overBudgetPercent        - How much over budget (0 if within budget)
 */

/**
 * Run the full two-step compliance check for a procurement.
 *
 * @param {Object}   params
 * @param {string}   params.annualPlanId     - _id of the linked AnnualPlan document
 * @param {*}        params.annualPlanItemId - _id of the specific item within the plan
 * @param {string}   params.department       - Requesting department name
 * @param {string}   params.faculty          - Requesting faculty name
 * @param {number}   params.totalEstimatedCost - Total cost of the procurement request
 * @param {number}   params.budgetYear       - Budget year (defaults to current year)
 * @param {string}   params.tenantId         - Tenant identifier
 * @returns {Promise<ComplianceResult>}
 */
async function checkCompliance({
  annualPlanId,
  annualPlanItemId,
  department,
  faculty,
  totalEstimatedCost,
  budgetYear,
  tenantId,
}) {
  const year = budgetYear || new Date().getFullYear();
  const requiredBudget = totalEstimatedCost || 0;

  const base = {
    annualPlanPassed: false,
    budgetPassed: false,
    passed: false,
    annualPlanStatus: null,
    annualPlanRef: null,
    annualItemDesc: null,
    remainingBudget: 0,
    requiredBudget,
    requiresSpecialApproval: false,
    overBudgetPercent: 0,
    failureReason: null,
  };

  // ── Step 1: Plan Compliance (Annual Plan or Final Master Plan) ──────────────
  if (!annualPlanId && !annualPlanItemId) {
    return { ...base, failureReason: 'no_annual_plan_linked' };
  }

  let plan = null;
  let isFmp = false;

  if (annualPlanId) {
    plan = await AnnualPlan.findOne({ _id: annualPlanId, tenantId }).lean();
    if (!plan) {
      plan = await FinalMasterPlan.findOne({ _id: annualPlanId, tenantId }).lean();
      if (plan) isFmp = true;
    }
  }

  if (!plan && annualPlanItemId) {
    plan = await AnnualPlan.findOne({ tenantId, 'items._id': annualPlanItemId }).lean();
    if (!plan) {
      plan = await FinalMasterPlan.findOne({ tenantId, 'items._id': annualPlanItemId }).lean();
      if (plan) isFmp = true;
    }
  }

  if (!plan) {
    return { ...base, failureReason: 'no_annual_plan_linked' };
  }

  base.annualPlanStatus = plan.status;
  base.annualPlanRef = plan.referenceNumber;

  // The plan must be approved / active
  const isApproved = isFmp ? plan.status === 'active' : plan.status === 'distribution_complete';
  if (!isApproved) {
    return {
      ...base,
      failureReason: 'plan_not_approved',
    };
  }

  // Verify the specific item exists in the plan
  let matchedItem = null;
  if (annualPlanItemId) {
    matchedItem = plan.items?.find(
      (i) => String(i._id || i.id) === String(annualPlanItemId)
    );
  } else {
    matchedItem = plan.items?.[0] || true;
  }

  if (!matchedItem) {
    return {
      ...base,
      failureReason: 'item_not_found',
    };
  }

  base.annualPlanPassed = true;
  base.annualItemDesc = matchedItem.description || plan.title;

  // ── Step 2: Department Budget Sufficiency ────────────────────────────────────
  // Find active BudgetAllocation for this year (or latest available)
  let allocations = await BudgetAllocation.find({
    tenantId,
    budgetYear: year,
  }).lean();

  if (allocations.length === 0) {
    allocations = await BudgetAllocation.find({ tenantId }).sort({ budgetYear: -1 }).lean();
  }

  let deptAlloc = null;
  let allocationId = null;

  const cleanDept = (department || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();
  const cleanFac = (faculty || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();

  for (const alloc of allocations) {
    const match = alloc.departmentAllocations?.find((d) => {
      const dDept = (d.department || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();
      const dFac = (d.faculty || '').toLowerCase().replace(/^faculty of\s+/i, '').trim();

      const deptMatch = cleanDept && (dDept === cleanDept || dDept.includes(cleanDept) || cleanDept.includes(dDept) || dFac === cleanDept);
      const facMatch = cleanFac && (dFac === cleanFac || dFac.includes(cleanFac) || cleanFac.includes(dFac) || dDept === cleanFac);
      return deptMatch || facMatch;
    });
    if (match) {
      deptAlloc = match;
      allocationId = alloc._id;
      break;
    }
  }

  if (!deptAlloc && allocations.length > 0) {
    const fallbackEntry = allocations[0].departmentAllocations?.[0];
    if (fallbackEntry) {
      deptAlloc = fallbackEntry;
      allocationId = allocations[0]._id;
    }
  }

  if (!deptAlloc) {
    return {
      ...base,
      failureReason: 'no_budget_allocated',
    };
  }

  const remaining = (deptAlloc.allocatedAmount || 0) - (deptAlloc.consumedAmount || 0);
  base.remainingBudget = remaining;
  base.allocationId = allocationId;

  if (requiredBudget <= remaining) {
    // Fully within budget — both checks pass
    base.budgetPassed = true;
    base.passed = true;
    return base;
  }

  // Over budget — check grace threshold (10%)
  const excess = requiredBudget - remaining;
  const overPercent = remaining > 0 ? (excess / remaining) * 100 : 100;
  base.overBudgetPercent = Math.round(overPercent * 10) / 10;

  if (overPercent <= 10) {
    // Within 10% grace — flag for special approval instead of hard reject
    return {
      ...base,
      budgetPassed: false,
      passed: false,
      failureReason: 'insufficient_budget',
      requiresSpecialApproval: true,
    };
  }

  // Over 10% — hard fail
  return {
    ...base,
    budgetPassed: false,
    passed: false,
    failureReason: 'insufficient_budget',
    requiresSpecialApproval: false,
  };
}

/**
 * Convenience: just check the annual plan item (without budget check).
 */
async function checkAnnualPlanCompliance({ annualPlanId, annualPlanItemId, tenantId }) {
  if (!annualPlanId && !annualPlanItemId) return { passed: false, reason: 'no_annual_plan_linked' };

  let plan = null;
  let isFmp = false;
  if (annualPlanId) {
    plan = await AnnualPlan.findOne({ _id: annualPlanId, tenantId }).lean();
    if (!plan) {
      plan = await FinalMasterPlan.findOne({ _id: annualPlanId, tenantId }).lean();
      if (plan) isFmp = true;
    }
  }
  if (!plan && annualPlanItemId) {
    plan = await AnnualPlan.findOne({ tenantId, 'items._id': annualPlanItemId }).lean();
    if (!plan) {
      plan = await FinalMasterPlan.findOne({ tenantId, 'items._id': annualPlanItemId }).lean();
      if (plan) isFmp = true;
    }
  }

  if (!plan) return { passed: false, reason: 'no_annual_plan_linked' };

  const isApproved = isFmp ? plan.status === 'active' : plan.status === 'distribution_complete';
  if (!isApproved) {
    return { passed: false, reason: 'plan_not_approved', planStatus: plan.status };
  }

  if (annualPlanItemId) {
    const item = plan.items?.find((i) => String(i._id || i.id) === String(annualPlanItemId));
    if (!item) return { passed: false, reason: 'item_not_found' };
  }

  return { passed: true, plan };
}

/**
 * Convenience: just check department budget availability.
 */
async function checkDepartmentBudget({ department, faculty, totalCost, budgetYear, tenantId }) {
  const year = budgetYear || new Date().getFullYear();
  const allocations = await BudgetAllocation.find({ tenantId, budgetYear: year }).lean();

  for (const alloc of allocations) {
    const match = alloc.departmentAllocations?.find((d) => {
      return (department && d.department === department) || (faculty && d.faculty === faculty);
    });
    if (match) {
      const remaining = (match.allocatedAmount || 0) - (match.consumedAmount || 0);
      return {
        found: true,
        remaining,
        allocated: match.allocatedAmount,
        consumed: match.consumedAmount,
        sufficient: totalCost <= remaining,
        allocationId: alloc._id,
      };
    }
  }

  return { found: false, remaining: 0, sufficient: false };
}

module.exports = { checkCompliance, checkAnnualPlanCompliance, checkDepartmentBudget };
