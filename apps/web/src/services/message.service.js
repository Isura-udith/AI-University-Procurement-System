/**
 * Message Service
 * Frontend API bindings for Communications Hub.
 */
import api from './api';

export const messageService = {
  /** Get messages for user with optional filters */
  getMessages: (params = {}) => api.get('/messages', { params }),

  /** Compose and send a message */
  sendMessage: (data) => api.post('/messages', data),

  /** Mark message as read */
  markRead: (id) => api.put(`/messages/${id}/read`),

  /** Get unread message count */
  getUnreadCount: () => api.get('/messages/unread-count'),

  /** Delete a message */
  deleteMessage: (id) => api.delete(`/messages/${id}`),
};

export default messageService;
