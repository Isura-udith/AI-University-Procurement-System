import api from './api';

export const vendorService = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  register: (data) => api.post('/vendors/register', data),
  verify: (id) => api.post(`/vendors/${id}/verify`),
  reject: (id, reason) => api.post(`/vendors/${id}/reject`, { reason }),
  blacklist: (id, reason) => api.post(`/vendors/${id}/blacklist`, { reason }),
  updatePerformance: (id, data) => api.put(`/vendors/${id}/performance`, data),
};

export default vendorService;
