import api from './api';

export const auditLogService = {
  getLogs: (params) => api.get('/audit-logs', { params }),
  getStats: () => api.get('/audit-logs/stats'),
  getUserTimeline: (userId, params) => api.get(`/audit-logs/user/${userId}`, { params }),
  exportLogs: (params) => api.get('/audit-logs/export', { params, responseType: 'blob' }),
};

export default auditLogService;

