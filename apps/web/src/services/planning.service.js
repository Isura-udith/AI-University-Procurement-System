import api from './api';

export const planningService = {
  // ── Master Procurement Plans (Phase 1) ──────────────────
  getMasterPlans: (params) => api.get('/master-plans', { params }),
  getMasterPlan: (id) => api.get(`/master-plans/${id}`),
  createMasterPlan: (data) => api.post('/master-plans', data),
  updateMasterPlan: (id, data) => api.put(`/master-plans/${id}`, data),
  submitMasterPlan: (id) => api.post(`/master-plans/${id}/submit`),
  approveMasterPlan: (id, data) => api.post(`/master-plans/${id}/approve`, data),
  getPendingMasterPlans: () => api.get('/master-plans/pending'),

  // ── Annual Procurement Plans (Phases 2 & 3) ─────────────
  getAnnualPlans: (params) => api.get('/annual-plans', { params }),
  getAnnualPlan: (id) => api.get(`/annual-plans/${id}`),
  createAnnualPlan: (data) => api.post('/annual-plans', data),
  updateAnnualPlan: (id, data) => api.put(`/annual-plans/${id}`, data),
  submitAnnualPlan: (id) => api.post(`/annual-plans/${id}/submit`),
  approveAnnualPlan: (id, data) => api.post(`/annual-plans/${id}/approve`, data),
  recordExternalApproval: (id, data) => api.post(`/annual-plans/${id}/external-approval`, data),
  confirmBudgetReceived: (id, data) => api.post(`/annual-plans/${id}/confirm-budget`, data),
  getPendingAnnualPlans: () => api.get('/annual-plans/pending'),

  // ── Budget Allocations (Phase 4) ────────────────────────
  getBudgetAllocations: (params) => api.get('/budget-allocations', { params }),
  getBudgetAllocation: (id) => api.get(`/budget-allocations/${id}`),
  createBudgetAllocation: (data) => api.post('/budget-allocations', data),
  advanceDistribution: (id) => api.post(`/budget-allocations/${id}/advance`),
  getMyBudget: () => api.get('/budget-allocations/my-budget'),
  consumeBudget: (id, data) => api.post(`/budget-allocations/${id}/consume`, data),
  releaseBudget: (id, data) => api.post(`/budget-allocations/${id}/release`, data),

  // ── Workflow Engine (45-Step Lifecycle) ──────────────────
  getWorkflowDefinition: () => api.get('/workflow/definition'),
  getApprovalAuthority: (amount) => api.get('/workflow/approval-authority', { params: { amount } }),
};

export default planningService;
