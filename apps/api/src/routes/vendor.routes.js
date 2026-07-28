/**
 * Vendor Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - supplier: Self-registration, upload KYC/CIDA certs, manage own profile
 *   - procurement_officer: Verify vendors, manage performance, blacklist
 *   - admin: Full vendor management
 *   - auditor: Read-only
 *   - Guest (public): Vendor self-registration endpoint
 */
const express = require('express');
const router = express.Router();
const {
  registerVendor, getAllVendors, getVendor, getMe,
  verifyVendor, blacklistVendor, updatePerformance, rejectVendor,
  approveAndSendSetupLink, getSetupAccountInfo, completeSetupAccount
} = require('../controllers/vendor.controller');
const { protect, authorize, tenantScope } = require('../middlewares/auth.middleware');

// Public self-service registration & account creation via email link (no auth required)
router.post('/register', tenantScope, registerVendor);
router.get('/setup-account-info', getSetupAccountInfo);
router.post('/setup-account', completeSetupAccount);

router.use(protect);

// List & Detail (includes Supplies Division)
router.get('/',
  authorize('supplies_division', 'procurement_officer', 'contract_manager', 'admin', 'vc', 'bursar', 'finance_officer', 'auditor', 'super_admin'),
  getAllVendors
);
router.get('/me',
  authorize('supplier'),
  getMe
);
router.get('/:id',
  authorize('supplies_division', 'procurement_officer', 'contract_manager', 'admin', 'vc', 'bursar', 'finance_officer', 'auditor', 'supplier', 'super_admin'),
  getVendor
);

// Approve vendor & send login account setup email link (Supplies Division & Admin)
router.post('/:id/approve-setup-link',
  authorize('supplies_division', 'procurement_officer', 'admin', 'super_admin'),
  approveAndSendSetupLink
);

// Vendor verification (KYC/CIDA review)
router.post('/:id/verify',
  authorize('supplies_division', 'procurement_officer', 'admin', 'super_admin'),
  verifyVendor
);

// Blacklist vendor
router.post('/:id/blacklist',
  authorize('supplies_division', 'procurement_officer', 'admin', 'super_admin'),
  blacklistVendor
);

// Reject vendor
router.post('/:id/reject',
  authorize('supplies_division', 'procurement_officer', 'admin', 'super_admin'),
  rejectVendor
);

// Performance scoring
router.put('/:id/performance',
  authorize('supplies_division', 'procurement_officer', 'contract_manager', 'admin', 'super_admin'),
  updatePerformance
);

module.exports = router;
