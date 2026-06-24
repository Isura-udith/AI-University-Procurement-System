/**
 * Notification Service - Enhanced
 * Handles CRUD operations, preference management, and query logic for notifications.
 */
const Notification = require('../models/notification.model');
const logger = require('../config/logger');

class NotificationService {
  async create(data) {
    return Notification.create(data);
  }

  async getForUser(userId, tenantId, query = {}) {
    const filters = { tenantId, recipient: userId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) filters.isRead = false;
    if (query.priority) filters.priority = query.priority;
    if (query.category) filters.category = query.category;
    if (query.type) filters.type = query.type;

    const limit = Math.min(parseInt(query.limit) || 50, 100);
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Notification.find(filters).sort('-createdAt').skip(skip).limit(limit).lean(),
      Notification.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  async markRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllRead(userId, tenantId) {
    const result = await Notification.updateMany(
      { recipient: userId, tenantId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { modified: result.modifiedCount };
  }

  async getUnreadCount(userId, tenantId) {
    return Notification.countDocuments({ recipient: userId, tenantId, isRead: false });
  }

  async getUnreadByPriority(userId, tenantId) {
    return Notification.aggregate([
      { $match: { recipient: userId, tenantId, isRead: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
  }

  async deleteNotification(id, userId) {
    return Notification.findOneAndDelete({ _id: id, recipient: userId });
  }

  async deleteAllRead(userId, tenantId) {
    const result = await Notification.deleteMany({ recipient: userId, tenantId, isRead: true });
    return { deleted: result.deletedCount };
  }

  async getGroupedByCategory(userId, tenantId) {
    return Notification.aggregate([
      { $match: { recipient: userId, tenantId, isRead: false } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        latest: { $first: '$$ROOT' },
      }},
      { $sort: { 'latest.createdAt': -1 } },
    ]);
  }
}

module.exports = new NotificationService();
