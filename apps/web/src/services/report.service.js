import api from './api';

export const reportService = {
  // Fetch all generated reports
  getReports: (params) => api.get('/reports', { params }),

  // Get report by ID
  getReportById: (id) => api.get(`/reports/${id}`),

  // Generate new report
  generateReport: (data) => api.post('/reports/generate', data),

  // Get spend analysis
  getSpendAnalysis: () => api.get('/reports/spend-analysis'),

  // Get vendor performance
  getVendorPerformance: () => api.get('/reports/vendor-performance'),

  // Get compliance audit
  getComplianceAudit: () => api.get('/reports/compliance-audit'),

  // Export report
  exportReport: (id, format = 'csv') => api.get(`/reports/${id}/export`, {
    params: { format },
    responseType: 'blob',
  }),

  // Update report status & details
  updateReportStatus: (id, data) => api.patch(`/reports/${id}`, data),

  // Delete report
  deleteReport: (id) => api.delete(`/reports/${id}`),
};

export default reportService;
