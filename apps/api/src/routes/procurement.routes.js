/**
 * Procurement Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - department_user, department_head: Create/view own requisitions
 *   - department_head, dean: Approve requisitions at respective levels
 *   - procurement_officer, admin: Full lifecycle management
 *   - finance_officer, bursar: Budget lock/validation
 *   - vc: High-level approval
 *   - auditor: Full read-only (blocked from writes by readOnlyGuard)
 *   - super_admin: Unrestricted
 */
const express = require('express');
const router = express.Router();
const {
  createProcurement, getAllProcurements, getProcurement,
  updateProcurement, submitProcurement, approveProcurement,
  rejectProcurement, lockBudget, unlockBudget, getDashboardStats,
  getPendingApprovals, getBudgetStatus, deleteProcurement,
  publishProcurement, getPublicProcurements,
} = require('../controllers/procurement.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { checkApprovalThreshold, requireSameFaculty, readOnlyGuard, requireWorkflowPhase } = require('../middlewares/role.middleware');

// Public endpoint — no authentication required
// Suppliers and visitors can view published procurements
router.get('/public', getPublicProcurements);

router.use(protect);

// Dashboard & Pending (most internal roles can view)
router.get('/dashboard-stats', getDashboardStats);
router.get('/pending-approvals',
  authorize('department_head', 'dean', 'procurement_officer', 'bursar', 'finance_officer', 'finance_committee', 'admin', 'vc', 'super_admin'),
  getPendingApprovals
);

// Budget status (for budget lock page)
router.get('/budget-status',
  authorize('finance_officer', 'bursar', 'admin', 'vc', 'auditor', 'super_admin'),
  getBudgetStatus
);

// Read - all procurement-related roles including auditor (read-only)
router.get('/',
  authorize(
    'department_user', 'department_head', 'dean',
    'procurement_officer', 'admin', 'vc',
    'bursar', 'finance_officer', 'finance_committee', 'auditor', 'super_admin'
  ),
  requireSameFaculty,
  getAllProcurements
);
router.get('/:id',
  authorize(
    'department_user', 'department_head', 'dean',
    'procurement_officer', 'admin', 'vc',
    'bursar', 'finance_officer', 'finance_committee', 'auditor', 'super_admin'
  ),
  requireSameFaculty,
  getProcurement
);

// Create (write roles only — readOnlyGuard blocks auditor/guest)
router.post('/',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  requireSameFaculty,
  createProcurement
);
router.put('/:id',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  updateProcurement
);
router.delete('/:id',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  deleteProcurement
);

// Workflow Actions (write + workflow phase guard)
router.post('/:id/submit',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  requireWorkflowPhase,
  submitProcurement
);
router.post('/:id/approve',
  authorize('department_head', 'dean', 'procurement_officer', 'bursar', 'finance_committee', 'admin', 'vc', 'super_admin'),
  readOnlyGuard,
  checkApprovalThreshold,
  requireSameFaculty,
  requireWorkflowPhase,
  approveProcurement
);
router.post('/:id/reject',
  authorize('department_head', 'dean', 'procurement_officer', 'bursar', 'finance_committee', 'admin', 'vc', 'super_admin'),
  readOnlyGuard,
  requireSameFaculty,
  requireWorkflowPhase,
  rejectProcurement
);
router.post('/:id/lock-budget',
  authorize('finance_officer', 'bursar', 'admin', 'super_admin'),
  readOnlyGuard,
  requireWorkflowPhase,
  lockBudget
);
router.post('/:id/unlock-budget',
  authorize('finance_officer', 'bursar', 'admin', 'super_admin'),
  readOnlyGuard,
  unlockBudget
);

// Publish to suppliers (after VC approval)
router.post('/:id/publish',
  authorize('procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  publishProcurement
);

module.exports = router;
