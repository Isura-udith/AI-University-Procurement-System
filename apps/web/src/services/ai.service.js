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
};

export default aiService;
