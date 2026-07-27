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

  // ── Draft Procurement Items (University User Inputs & Multi-Stage Approvals) ──
  getDraftItems: (params) => api.get('/draft-procurements', { params }),
  saveDraftItems: (items) => api.post('/draft-procurements/save', { items }),
  submitDraftItems: (itemIds, targetStage) => api.post('/draft-procurements/submit', { itemIds, targetStage }),
  getPendingHodItems: () => api.get('/draft-procurements/pending-hod'),
  hodApproveDraftItem: (id, data) => api.post(`/draft-procurements/${id}/hod-approve`, data),
  getPendingDraftItems: (stage) => api.get('/draft-procurements/pending', { params: { stage } }),
  approveDraftItem: (id, data) => api.post(`/draft-procurements/${id}/approve`, data),
  getApprovedDraftItems: (params) => api.get('/draft-procurements/approved', { params }),
  compileFinalMasterPlan: (data) => api.post('/draft-procurements/compile-final', data),
  deleteDraftItem: (id) => api.delete(`/draft-procurements/${id}`),

  // ── Final Master Plans ──────────────────────────────────
  getFinalMasterPlans: (params) => api.get('/final-master-plans', { params }),
  getFinalMasterPlan: (id) => api.get(`/final-master-plans/${id}`),
  createFinalMasterPlan: (data) => api.post('/final-master-plans', data),
  updateFinalMasterPlan: (id, data) => api.put(`/final-master-plans/${id}`, data),
  addItemsToFinalPlan: (id, draftItemIds) => api.post(`/final-master-plans/${id}/add-items`, { draftItemIds }),
  submitFinalMasterPlan: (id) => api.post(`/final-master-plans/${id}/submit`),
  approveFinalMasterPlan: (id, data) => api.post(`/final-master-plans/${id}/approve`, data),
  getPendingFinalMasterPlans: () => api.get('/final-master-plans/pending'),
  getApprovedFinalPlanItems: (params) => api.get('/final-master-plans/approved-items', { params }),

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
