const express = require('express');
const router = express.Router();
const {
  getMarketPrice, verifyQuotations, getSmartRecommendations,
  parseRequisition, getMarketAlerts, getRiskScore,
  getComparativeAnalysis, getHistoricalMatch, getDemandForecast,
  getExplainabilityLogs, getExplainabilityStats, getExplainabilityLog,
  acknowledgeAlert, getAIStatus, askFlowiseChat, runInternalQuery,
  uploadKnowledgeDocument, getKnowledgeDocuments, deleteKnowledgeDocument,
  processKnowledgeBase, scanDocumentsFolder,
  // New chat session endpoints
  getChatSessions, getChatHistory, deleteChatSession, renameChatSession,
  togglePinSession, rateChatMessage,
} = require('../controllers/ai.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');
const { upload } = require('../integrations/file.storage');

// Public route for local Flowise server (authenticated via shared secret header)
router.post('/internal-query', runInternalQuery);

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
  authorize('auditor', 'procurement_officer', 'admin', 'vc', 'super_admin'),
  getExplainabilityLogs
);
router.get('/explainability-logs/stats',
  authorize('auditor', 'procurement_officer', 'admin', 'vc', 'super_admin'),
  getExplainabilityStats
);
router.get('/explainability-logs/:id',
  authorize('auditor', 'procurement_officer', 'admin', 'vc', 'super_admin'),
  getExplainabilityLog
);

// AI system status check (all authenticated users)
router.get('/status', getAIStatus);

// ─── Interactive Flowise Chatbot (all authenticated users) ────────
router.post('/chat', askFlowiseChat);

// ─── Chat Session Management ─────────────────────────────────────
router.get('/chat/sessions', getChatSessions);
router.get('/chat/sessions/:sessionId', getChatHistory);
router.delete('/chat/sessions/:sessionId', deleteChatSession);
router.patch('/chat/sessions/:sessionId', renameChatSession);
router.post('/chat/sessions/:sessionId/pin', togglePinSession);
router.post('/chat/sessions/:sessionId/rate', rateChatMessage);

// ─── Flowise Knowledge Base Operations ────────────────────────────
router.post('/knowledge/upload',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  upload.single('file'),
  uploadKnowledgeDocument
);

router.get('/knowledge/documents',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  getKnowledgeDocuments
);

router.delete('/knowledge/documents/:id',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  deleteKnowledgeDocument
);

router.post('/knowledge/process',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  processKnowledgeBase
);

router.post('/knowledge/scan-folder',
  authorize('department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'),
  scanDocumentsFolder
);

module.exports = router;
