import api from './api';

/**
 * Dashboard Service - Aggregates real data from multiple API endpoints
 * for the main dashboard page.
 */
export const dashboardService = {
  /** Procurement KPIs + byStatus + byCategory + byDepartment + recentItems */
  getProcurementStats: () => api.get('/procurements/dashboard-stats'),

  /** Items pending the current user's approval */
  getPendingApprovals: () => api.get('/procurements/pending-approvals'),

  /** Paginated procurement list – used for recent activity + pipeline */
  getRecentProcurements: (params = {}) =>
    api.get('/procurements', { params: { limit: 10, sort: '-createdAt', ...params } }),

  /** Active contracts list */
  getContracts: (params = {}) =>
    api.get('/contracts', { params: { limit: 100, ...params } }),

  /** Vendor list (for count + top performers) */
  getVendors: (params = {}) =>
    api.get('/vendors', { params: { limit: 100, ...params } }),

  /** Tender list (for pipeline + method breakdown) */
  getTenders: (params = {}) =>
    api.get('/tenders', { params: { limit: 100, ...params } }),
};

export default dashboardService;
