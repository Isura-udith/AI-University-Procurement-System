import api from './api';

export const procurementService = {
  getAll: (params) => api.get('/procurements', { params }),
  getById: (id) => api.get(`/procurements/${id}`),
  create: (data) => api.post('/procurements', data),
  update: (id, data) => api.put(`/procurements/${id}`, data),
  delete: (id) => api.delete(`/procurements/${id}`),
  submit: (id) => api.post(`/procurements/${id}/submit`),
  approve: (id, data) => api.post(`/procurements/${id}/approve`, data),
  reject: (id, data) => api.post(`/procurements/${id}/reject`, data),
  lockBudget: (id) => api.post(`/procurements/${id}/lock-budget`),
  unlockBudget: (id) => api.post(`/procurements/${id}/unlock-budget`),
  getDashboardStats: () => api.get('/procurements/dashboard-stats'),
  getPendingApprovals: () => api.get('/procurements/pending-approvals'),
  getAuditLog: (id) => api.get(`/procurements/${id}/audit-log`),
  getBudgetStatus: (params) => api.get('/procurements/budget-status', { params }),
  /** Run pre-submission budget compliance check (DAPP item + remaining budget) */
  checkBudget: (id) => api.get(`/procurements/${id}/budget-check`),
  publish: (id) => api.post(`/procurements/${id}/publish`),
  getPublic: () => api.get('/procurements/public'),
  getPublicAnalytics: () => api.get('/reports/public-analytics'),
};

export default procurementService;
