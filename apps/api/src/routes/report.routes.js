const express = require('express');
const router = express.Router();
const {
  generateReport,
  getAllReports,
  getReport,
  updateReport,
  getSpendAnalysis,
  getVendorPerformance,
  getComplianceAudit,
  exportReport,
  deleteReport,
  getPublicAnalytics
} = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Public route for landing page analytics
router.get('/public-analytics', getPublicAnalytics);

router.use(protect);

// All reports
router.get('/',
  authorize('procurement_officer', 'contract_manager', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'department_head', 'auditor', 'super_admin'),
  getAllReports
);

// Spend analysis
router.get('/spend-analysis',
  authorize('procurement_officer', 'admin', 'vc', 'bursar', 'finance_officer', 'dean', 'auditor', 'super_admin'),
  getSpendAnalysis
);

// Vendor performance report
router.get('/vendor-performance',
  authorize('procurement_officer', 'admin', 'vc', 'bursar', 'contract_manager', 'auditor', 'super_admin'),
  getVendorPerformance
);

// Compliance audit report
router.get('/compliance-audit',
  authorize('procurement_officer', 'admin', 'vc', 'bursar', 'auditor', 'super_admin'),
  getComplianceAudit
);

// Generate new report
router.post('/generate',
  authorize('procurement_officer', 'bursar', 'admin', 'vc', 'auditor', 'super_admin'),
  generateReport
);

// Export single report (CSV / JSON)
router.get('/:id/export',
  authorize('procurement_officer', 'contract_manager', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'department_head', 'auditor', 'super_admin'),
  exportReport
);

// Single report detail
router.get('/:id',
  authorize('procurement_officer', 'contract_manager', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'department_head', 'auditor', 'super_admin'),
  getReport
);

// Update report status / details
router.patch('/:id',
  authorize('procurement_officer', 'bursar', 'admin', 'vc', 'auditor', 'super_admin'),
  updateReport
);

// Delete report
router.delete('/:id',
  authorize('admin', 'super_admin'),
  deleteReport
);

module.exports = router;

