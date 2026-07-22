import api from './api';

export const aiService = {
  // Feature 1 & 4: NLP + Market Price
  getMarketPrice: (data) => api.post('/ai/market-price', data),
  parseRequisition: (rawText) => api.post('/ai/parse-requisition', { rawText }),

  // Feature 2: Price Verification
  verifyQuotations: (tenderId) => api.post(`/ai/verify-quotations/${tenderId}`),

  // Feature 3: Smart Recommendations
  getSmartRecommendations: (tenderId) => api.post(`/ai/smart-recommendations/${tenderId}`),

  // Feature 5: Market Monitoring
  getMarketAlerts: (refresh = false) => api.get('/ai/market-alerts', { params: { refresh } }),
  acknowledgeAlert: (alertId, actionTaken) => api.post(`/ai/acknowledge-alert/${alertId}`, { actionTaken }),

  // Feature 6: Risk Score
  getRiskScore: (procurementId) => api.post(`/ai/risk-score/${procurementId}`),

  // Feature 7: Comparative Analysis
  getComparativeAnalysis: (tenderId, weights) => api.post(`/ai/comparative-analysis/${tenderId}`, { weights }),

  // Feature 8: Historical Match
  getHistoricalMatch: (procurementId) => api.post(`/ai/historical-match/${procurementId}`),

  // Feature 9: Demand Forecast
  getDemandForecast: (params) => api.get('/ai/demand-forecast', { params }),

  // Governance: Explainability
  getExplainabilityLogs: (params) => api.get('/ai/explainability-logs', { params }),
  getExplainabilityStats: () => api.get('/ai/explainability-logs/stats'),
  getExplainabilityLog: (id) => api.get(`/ai/explainability-logs/${id}`),

  // System: AI status / health check (now returns combined Gemini + Flowise)
  getAIStatus: () => api.get('/ai/status'),

  // ─── Interactive Flowise Chat (Enhanced) ───────────────────────
  askFlowiseChat: (question, sessionId) => api.post('/ai/chat', { question, sessionId }),

  // ─── Chat Session Management ──────────────────────────────────
  getChatSessions: (params) => api.get('/ai/chat/sessions', { params }),
  getChatHistory: (sessionId) => api.get(`/ai/chat/sessions/${sessionId}`),
  deleteChatSession: (sessionId) => api.delete(`/ai/chat/sessions/${sessionId}`),
  renameChatSession: (sessionId, title) => api.patch(`/ai/chat/sessions/${sessionId}`, { title }),
  togglePinSession: (sessionId) => api.post(`/ai/chat/sessions/${sessionId}/pin`),
  rateChatMessage: (sessionId, messageIndex, rating, feedback) =>
    api.post(`/ai/chat/sessions/${sessionId}/rate`, { messageIndex, rating, feedback }),

  // ─── Flowise Knowledge Base (Document Store) ──────────────────
  uploadKnowledgeDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getKnowledgeDocuments: () => api.get('/ai/knowledge/documents'),
  deleteKnowledgeDocument: (id) => api.delete(`/ai/knowledge/documents/${id}`),
  processKnowledgeBase: () => api.post('/ai/knowledge/process'),
  scanDocumentsFolder: (folderPath) => api.post('/ai/knowledge/scan-folder', { folderPath }),
};

export default aiService;
