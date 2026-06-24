import api from './api';

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  threeWayMatch: (id) => api.post(`/payments/${id}/three-way-match`),
  approve: (id, data) => api.post(`/payments/${id}/approve`, data),
  markPaid: (id, data) => api.post(`/payments/${id}/mark-paid`, data),
};

export default paymentService;
