/**
 * Payment Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - finance_officer: Daily AP operations (verify vote particulars, tax, process invoices)
 *   - bursar: 3-way match approval, high-value budget commitments
 *   - store_manager: Can view delivery/GRN related payment status
 *   - procurement_officer: Payment initiation
 *   - supplier: View own payment disbursement status
 *   - auditor: Full read-only (blocked from writes by readOnlyGuard)
 */
const express = require('express');
const router = express.Router();
const {
  createPayment, getAllPayments, getPayment,
  threeWayMatch, approvePayment, markPaid,
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');

router.use(protect);

// List & Detail - includes auditor for full read-only oversight
router.get('/',
  authorize('finance_officer', 'bursar', 'procurement_officer', 'contract_manager', 'admin', 'vc', 'store_manager', 'supplier', 'auditor', 'super_admin'),
  getAllPayments
);
router.get('/:id',
  authorize('finance_officer', 'bursar', 'procurement_officer', 'contract_manager', 'admin', 'vc', 'store_manager', 'supplier', 'auditor', 'super_admin'),
  getPayment
);

// Create payment voucher (write roles only)
router.post('/',
  authorize('finance_officer', 'procurement_officer', 'admin', 'super_admin'),
  readOnlyGuard,
  createPayment
);

// 3-Way Match: PO ↔ Invoice ↔ GRN (bursar final verification)
router.post('/:id/three-way-match',
  authorize('finance_officer', 'bursar', 'admin', 'super_admin'),
  readOnlyGuard,
  threeWayMatch
);

// Approve payment (bursar authority)
router.post('/:id/approve',
  authorize('bursar', 'admin', 'super_admin'),
  readOnlyGuard,
  approvePayment
);

// Mark as paid / disbursed
router.post('/:id/mark-paid',
  authorize('finance_officer', 'bursar', 'admin', 'super_admin'),
  readOnlyGuard,
  markPaid
);

module.exports = router;
