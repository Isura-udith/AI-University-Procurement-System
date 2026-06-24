/**
 * AI Routes — RBAC-enforced endpoints for all AI features.
 *
 * Access:
 *   - procurement_officer, admin: Full access to all AI features
 *   - tec_member: Bid verification, comparative analysis, recommendations
 *   - bursar, finance_officer: Market monitoring, risk scores, demand forecast
 *   - dean, vc: Read access to recommendations and risk scores
 *   - auditor: Read-only access to explainability logs
 *   - super_admin: Unrestricted
 */
const express = require('express');
const router = express.Router();
const {
  getMarketPrice, verifyQuotations, getSmartRecommendations,
  parseRequisition, getMarketAlerts, getRiskScore,
  getComparativeAnalysis, getHistoricalMatch, getDemandForecast,
  getExplainabilityLogs, getExplainabilityStats, getExplainabilityLog,
  acknowledgeAlert,
} = require('../controllers/ai.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');

router.use(protect);

// Feature 1 & 4: NLP Parsing + Market Price Recommendation
router.post('/market-price',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  getMarketPrice
);

// Feature 4: NLP Parse Requisition (standalone)
router.post('/parse-requisition',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  parseRequisition
);

// Feature 2: Seller Price Verification
router.post('/verify-quotations/:tenderId',
  authorize('procurement_officer', 'tec_member', 'admin', 'super_admin'),
  verifyQuotations
);

// Feature 3: Smart Decision Support
router.post('/smart-recommendations/:tenderId',
  authorize('procurement_officer', 'tec_member', 'admin', 'vc', 'dean', 'super_admin'),
  getSmartRecommendations
);

// Feature 5: Dynamic Market Monitoring
router.get('/market-alerts',
  authorize('procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'super_admin'),
  getMarketAlerts
);

// Feature 5: Acknowledge Market Alert
router.post('/acknowledge-alert/:alertId',
  authorize('procurement_officer', 'bursar', 'admin', 'super_admin'),
  acknowledgeAlert
);

// Feature 6: Procurement Risk Scoring
router.post('/risk-score/:procurementId',
  authorize('procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'dean', 'super_admin'),
  getRiskScore
);

// Feature 7: Comparative Quotation Analysis
router.post('/comparative-analysis/:tenderId',
  authorize('procurement_officer', 'tec_member', 'admin', 'super_admin'),
  getComparativeAnalysis
);

// Feature 8: Historical Procurement Analysis
router.post('/historical-match/:procurementId',
  authorize('procurement_officer', 'bursar', 'finance_officer', 'admin', 'super_admin'),
  getHistoricalMatch
);

// Feature 9: Demand Forecasting
router.get('/demand-forecast',
  authorize('procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'super_admin'),
  getDemandForecast
);

// Governance: Explainability Audit Trail
router.get('/explainability-logs',
  authorize('auditor', 'admin', 'vc', 'super_admin'),
  getExplainabilityLogs
);
router.get('/explainability-logs/stats',
  authorize('auditor', 'admin', 'super_admin'),
  getExplainabilityStats
);
router.get('/explainability-logs/:id',
  authorize('auditor', 'admin', 'vc', 'super_admin'),
  getExplainabilityLog
);

module.exports = router;
