/**
 * ─────────────────────────────────────────────────────────────
 * API Endpoints Configuration
 * Centralized endpoint definitions for the Smart Procurement API
 * ─────────────────────────────────────────────────────────────
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN:            `${API_BASE}/auth/login`,
    REGISTER:         `${API_BASE}/auth/register`,
    LOGOUT:           `${API_BASE}/auth/logout`,
    PROFILE:          `${API_BASE}/auth/profile`,
    CHANGE_PASSWORD:  `${API_BASE}/auth/change-password`,
    FORGOT_PASSWORD:  `${API_BASE}/auth/forgot-password`,
    RESET_PASSWORD:   `${API_BASE}/auth/reset-password`,
  },

  // Procurement
  PROCUREMENT: {
    BASE:             `${API_BASE}/procurements`,
    DASHBOARD_STATS:  `${API_BASE}/procurements/dashboard-stats`,
    PENDING_APPROVALS:`${API_BASE}/procurements/pending-approvals`,
    BY_ID:            (id) => `${API_BASE}/procurements/${id}`,
    SUBMIT:           (id) => `${API_BASE}/procurements/${id}/submit`,
    APPROVE:          (id) => `${API_BASE}/procurements/${id}/approve`,
    REJECT:           (id) => `${API_BASE}/procurements/${id}/reject`,
    LOCK_BUDGET:      (id) => `${API_BASE}/procurements/${id}/lock-budget`,
  },

  // Tenders
  TENDER: {
    BASE:             `${API_BASE}/tenders`,
    BY_ID:            (id) => `${API_BASE}/tenders/${id}`,
    PUBLISH:          (id) => `${API_BASE}/tenders/${id}/publish`,
    OPEN_BID_BOX:     (id) => `${API_BASE}/tenders/${id}/open-bid-box`,
    BIDS:             (id) => `${API_BASE}/tenders/${id}/bids`,
    CLARIFICATIONS:   (id) => `${API_BASE}/tenders/${id}/clarifications`,
  },

  // Contracts
  CONTRACT: {
    BASE:             `${API_BASE}/contracts`,
    EXPIRING:         `${API_BASE}/contracts/expiring`,
    BY_ID:            (id) => `${API_BASE}/contracts/${id}`,
    SIGN:             (id) => `${API_BASE}/contracts/${id}/sign`,
    VARIATION:        (id) => `${API_BASE}/contracts/${id}/variation`,
  },

  // Payments
  PAYMENT: {
    BASE:             `${API_BASE}/payments`,
    BY_ID:            (id) => `${API_BASE}/payments/${id}`,
    THREE_WAY_MATCH:  (id) => `${API_BASE}/payments/${id}/three-way-match`,
    APPROVE:          (id) => `${API_BASE}/payments/${id}/approve`,
    MARK_PAID:        (id) => `${API_BASE}/payments/${id}/mark-paid`,
  },

  // Vendors
  VENDOR: {
    BASE:             `${API_BASE}/vendors`,
    REGISTER:         `${API_BASE}/vendors/register`,
    BY_ID:            (id) => `${API_BASE}/vendors/${id}`,
    VERIFY:           (id) => `${API_BASE}/vendors/${id}/verify`,
    BLACKLIST:        (id) => `${API_BASE}/vendors/${id}/blacklist`,
    PERFORMANCE:      (id) => `${API_BASE}/vendors/${id}/performance`,
  },

  // Users
  USER: {
    BASE:             `${API_BASE}/users`,
    BY_ID:            (id) => `${API_BASE}/users/${id}`,
    DELEGATE:         `${API_BASE}/users/delegate`,
  },

  // Reports
  REPORT: {
    BASE:             `${API_BASE}/reports`,
    SPEND_ANALYSIS:   `${API_BASE}/reports/spend-analysis`,
    GENERATE:         `${API_BASE}/reports/generate`,
    BY_ID:            (id) => `${API_BASE}/reports/${id}`,
  },

  // Notifications
  NOTIFICATION: {
    BASE:             `${API_BASE}/notifications`,
    UNREAD_COUNT:     `${API_BASE}/notifications/unread-count`,
    READ_ALL:         `${API_BASE}/notifications/read-all`,
    MARK_READ:        (id) => `${API_BASE}/notifications/${id}/read`,
  },

  // Health
  HEALTH:             `${API_BASE}/health`,
};

export default API_ENDPOINTS;
