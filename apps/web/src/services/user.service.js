/**
 * User Management Service
 * Frontend API calls for admin user CRUD operations.
 * All data is persisted to and fetched from the database.
 */
import api from './api';

export const userService = {
  /** Create a new user (admin only) */
  createUser: (data) => api.post('/users', data),

  /** Get all users with optional filters */
  getUsers: (params = {}) => api.get('/users', { params }),

  /** Get user statistics */
  getStats: () => api.get('/users/stats'),

  /** Get a single user by ID */
  getUser: (id) => api.get(`/users/${id}`),

  /** Update a user */
  updateUser: (id, data) => api.put(`/users/${id}`, data),

  /** Deactivate a user */
  deactivateUser: (id) => api.delete(`/users/${id}`),

  /** Activate a user */
  activateUser: (id) => api.patch(`/users/${id}/activate`),

  /** Reset user password (admin) */
  resetPassword: (id, newPassword) => api.patch(`/users/${id}/reset-password`, { newPassword }),
};

export default userService;
