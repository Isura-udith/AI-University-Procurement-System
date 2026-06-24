import api from './api';

export const contractService = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  sign: (id, data) => api.post(`/contracts/${id}/sign`, data),
  terminate: (id, data) => api.post(`/contracts/${id}/terminate`, data),
  suspend: (id, data) => api.post(`/contracts/${id}/suspend`, data),
  extend: (id, data) => api.post(`/contracts/${id}/extend`, data),
  addVariation: (id, data) => api.post(`/contracts/${id}/variation`, data),
  addAmendment: (id, data) => api.post(`/contracts/${id}/amendment`, data),
  addMilestone: (id, data) => api.post(`/contracts/${id}/milestones`, data),
  updateMilestone: (id, milestoneId, data) => api.put(`/contracts/${id}/milestones/${milestoneId}`, data),
  addDeliverable: (id, data) => api.post(`/contracts/${id}/deliverables`, data),
  updateDeliverable: (id, deliverableId, data) => api.put(`/contracts/${id}/deliverables/${deliverableId}`, data),
  updatePerformance: (id, data) => api.post(`/contracts/${id}/performance`, data),
  markPayment: (id, paymentIdx, data) => api.post(`/contracts/${id}/payments/${paymentIdx}/mark-paid`, data),
  getExpiring: (days) => api.get('/contracts/expiring', { params: { days } }),
  getAuditLog: (id) => api.get(`/contracts/${id}/audit-log`),
  // Delivery & GRN
  getDeliveries: () => api.get('/contracts/deliveries'),
  recordGRN: (id, data) => api.post(`/contracts/${id}/record-grn`, data),
  resolveDiscrepancy: (id) => api.post(`/contracts/${id}/resolve-discrepancy`),
};

export default contractService;
