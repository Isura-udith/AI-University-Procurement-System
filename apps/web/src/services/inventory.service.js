import api from './api';

export const inventoryService = {
  // ── Inventory Stock ──────────────────────────────────────
  getInventory: (params) => api.get('/inventory/items', { params }),
  getInventoryItem: (id) => api.get(`/inventory/items/${id}`),
  getInventoryStats: () => api.get('/inventory/stats'),

  // ── Goods Receipt Notes (Phase 7) ───────────────────────
  getGRNs: (params) => api.get('/inventory/grn', { params }),
  getGRN: (id) => api.get(`/inventory/grn/${id}`),
  createGRN: (data) => api.post('/inventory/grn', data),
  inspectGRN: (id, data) => api.post(`/inventory/grn/${id}/inspect`, data),

  // ── Department Issuances (Phase 8) ──────────────────────
  getIssuances: (params) => api.get('/inventory/issuances', { params }),
  createIssuance: (data) => api.post('/inventory/issuances', data),
  approveIssuance: (id) => api.post(`/inventory/issuances/${id}/approve`),
  issueItems: (id) => api.post(`/inventory/issuances/${id}/issue`),
  confirmDeptReceipt: (id) => api.post(`/inventory/issuances/${id}/confirm-receipt`),
};

export default inventoryService;
