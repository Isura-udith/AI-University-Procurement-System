import api from './api';

export const tenderService = {
  getAll: (params) => api.get('/tenders', { params }),
  getById: (id) => api.get(`/tenders/${id}`),
  create: (data) => api.post('/tenders', data),
  update: (id, data) => api.put(`/tenders/${id}`, data),
  delete: (id) => api.delete(`/tenders/${id}`),
  publish: (id) => api.post(`/tenders/${id}/publish`),
  cancel: (id, data) => api.post(`/tenders/${id}/cancel`, data),
  extendDeadline: (id, data) => api.post(`/tenders/${id}/extend-deadline`, data),
  closeBidding: (id) => api.post(`/tenders/${id}/close-bidding`),
  openBidBox: (id) => api.post(`/tenders/${id}/open-bid-box`),
  getBids: (id) => api.get(`/tenders/${id}/bids`),
  submitBid: (id, data) => api.post(`/tenders/${id}/bids`, data),
  withdrawBid: (id, bidId) => api.post(`/tenders/${id}/bids/${bidId}/withdraw`),
  addClarification: (id, data) => api.post(`/tenders/${id}/clarifications`, data),
  answerClarification: (id, index, data) => api.post(`/tenders/${id}/clarifications/${index}/answer`, data),
  generateOpeningMinutes: (id) => api.post(`/tenders/${id}/generate-minutes`),
  unsealBid: (id, bidId) => api.post(`/tenders/${id}/bids/${bidId}/unseal`),
  recordBidPrice: (id, bidId, data) => api.post(`/tenders/${id}/bids/${bidId}/record-price`, data),
  evaluateBid: (id, bidId, data) => api.post(`/tenders/${id}/bids/${bidId}/evaluate`, data),
  awardTender: (id, data) => api.post(`/tenders/${id}/award`, data),
  issueLOA: (id, data) => api.post(`/tenders/${id}/issue-loa`, data),
  submitAppeal: (id, data) => api.post(`/tenders/${id}/appeals`, data),
  resolveAppeal: (id, appealId, data) => api.post(`/tenders/${id}/appeals/${appealId}/resolve`, data),
  requestDebriefing: (id, data) => api.post(`/tenders/${id}/debriefing`, data),
  completeBidOpening: (id) => api.post(`/tenders/${id}/complete-opening`),
  getEvaluationResults: (id) => api.get(`/tenders/${id}/evaluation-results`),
  submitEvaluation: (id, data) => api.post(`/tenders/${id}/submit-evaluation`, data),
  // New: Addenda management
  addAddendum: (id, data) => api.post(`/tenders/${id}/addenda`, data),
  // New: Committee assignment
  assignCommittee: (id, data) => api.put(`/tenders/${id}/committee`, data),
  // New: Debriefing resolution
  resolveDebriefing: (id, debriefIndex, data) => api.post(`/tenders/${id}/debriefing/${debriefIndex}/resolve`, data),
};

export default tenderService;
