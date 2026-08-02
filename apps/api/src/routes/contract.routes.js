/**
 * Contract Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - contract_manager: Full CLM (milestones, SLA compliance, security alerts)
 *   - procurement_officer: Create contracts, add variations
 *   - vc: Digital signature of high-value contracts & LOA
 *   - admin: Full management
 *   - auditor: Read-only (blocked from writes by readOnlyGuard)
 *   - supplier: View own contracts only
 *   - store_manager: GRN recording and deliverable updates
 */
const express = require('express');
const router = express.Router();
const {
  createContract, getAllContracts, getContractStats, getContract, updateContract, deleteContract,
  signContract, terminateContract, suspendContract, extendContract,
  addVariation, addAmendment, addMilestone, updateMilestone,
  addDeliverable, updateDeliverable, updatePerformance, markPaymentPaid,
  getAuditLog, getExpiring, getDeliveries, recordGRN, resolveDiscrepancy,
} = require('../controllers/contract.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');

router.use(protect);

// KPI Stats
router.get('/stats',
  authorize('contract_manager', 'procurement_officer', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'auditor', 'supplier', 'super_admin'),
  getContractStats
);

// Expiring contracts alerts (contract managers + admin)
router.get('/expiring',
  authorize('contract_manager', 'procurement_officer', 'admin', 'auditor', 'super_admin'),
  getExpiring
);

// Deliveries (GRN / 3-Way Match) - includes auditor read access
router.get('/deliveries',
  authorize('contract_manager', 'procurement_officer', 'store_manager', 'finance_officer', 'bursar', 'admin', 'auditor', 'super_admin'),
  getDeliveries
);

// List & Detail - includes auditor for full read-only oversight
router.get('/',
  authorize('contract_manager', 'procurement_officer', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'auditor', 'supplier', 'super_admin'),
  getAllContracts
);
router.get('/:id',
  authorize('contract_manager', 'procurement_officer', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'auditor', 'supplier', 'super_admin'),
  getContract
);

// Create contract (write roles only)
router.post('/',
  authorize('procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  createContract
);

// Update contract
router.put('/:id',
  authorize('procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  updateContract
);

// Delete contract (draft only)
router.delete('/:id',
  authorize('procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  deleteContract
);

// Digital signature (VC, Contract Manager, Procurement Officer, Admin, Supplier signs contracts)
router.post('/:id/sign',
  authorize('vc', 'contract_manager', 'procurement_officer', 'admin', 'supplier', 'super_admin'),
  readOnlyGuard,
  signContract
);
 
// Contract lifecycle actions
router.post('/:id/terminate',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  terminateContract
);

router.post('/:id/suspend',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  suspendContract
);

router.post('/:id/extend',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  extendContract
);

// Contract variations & amendments
router.post('/:id/variation',
  authorize('procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  addVariation
);

router.post('/:id/amendment',
  authorize('procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  addAmendment
);

// Milestones
router.post('/:id/milestones',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  addMilestone
);

router.put('/:id/milestones/:milestoneId',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  updateMilestone
);

// Deliverables
router.post('/:id/deliverables',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  addDeliverable
);

router.put('/:id/deliverables/:deliverableId',
  authorize('contract_manager', 'procurement_officer', 'store_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  updateDeliverable
);

// Performance (SLA metrics)
router.post('/:id/performance',
  authorize('contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  updatePerformance
);

// Payment schedule mark-paid
router.post('/:id/payments/:paymentIdx/mark-paid',
  authorize('finance_officer', 'bursar', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  markPaymentPaid
);

// Audit log (includes auditor for oversight)
router.get('/:id/audit-log',
  authorize('contract_manager', 'procurement_officer', 'admin', 'auditor', 'super_admin'),
  getAuditLog
);

// GRN / Discrepancy resolution (store_manager primary, others secondary)
router.post('/:id/record-grn',
  authorize('store_manager', 'contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  recordGRN
);

router.post('/:id/resolve-discrepancy',
  authorize('store_manager', 'contract_manager', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  resolveDiscrepancy
);

module.exports = router;
