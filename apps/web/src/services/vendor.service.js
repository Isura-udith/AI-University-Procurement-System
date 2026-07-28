import api from './api';

export const vendorService = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  getMe: () => api.get('/vendors/me'),
  register: (data) => api.post('/vendors/register', data),
  verify: (id) => api.post(`/vendors/${id}/verify`),
  approveAndSendSetupLink: (id) => api.post(`/vendors/${id}/approve-setup-link`),
  getSetupAccountInfo: (token) => api.get(`/vendors/setup-account-info?token=${token}`),
  completeSetupAccount: (data) => api.post('/vendors/setup-account', data),
  reject: (id, reason) => api.post(`/vendors/${id}/reject`, { reason }),
  blacklist: (id, reason) => api.post(`/vendors/${id}/blacklist`, { reason }),
  updatePerformance: (id, data) => api.put(`/vendors/${id}/performance`, data),
};

export default vendorService;
