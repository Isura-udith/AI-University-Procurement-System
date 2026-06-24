/**
 * Report Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - auditor: Full read-only to all reports, audit trails, AI-flagged anomalies
 *   - vc, bursar: Executive-level reports
 *   - procurement_officer, admin: Generate procurement reports
 *   - dean: Faculty-scoped reports
 *   - finance_officer: Financial reports
 */
const express = require('express');
const router = express.Router();
const {
  generateReport, getAllReports, getReport, getSpendAnalysis,
} = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// All reports (most internal roles can read)
router.get('/',
  authorize('procurement_officer', 'contract_manager', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'department_head', 'auditor', 'super_admin'),
  getAllReports
);

// Spend analysis
router.get('/spend-analysis',
  authorize('procurement_officer', 'admin', 'vc', 'bursar', 'finance_officer', 'dean', 'auditor', 'super_admin'),
  getSpendAnalysis
);

// Single report detail
router.get('/:id',
  authorize('procurement_officer', 'contract_manager', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'department_head', 'auditor', 'super_admin'),
  getReport
);

// Generate new report
router.post('/generate',
  authorize('procurement_officer', 'bursar', 'admin', 'vc', 'auditor', 'super_admin'),
  generateReport
);

module.exports = router;
