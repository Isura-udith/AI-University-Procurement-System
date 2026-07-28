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

  async sendNotification(data) {
    const emailService = require('./email.service');
    const { recipientId, recipientEmail, title, message, type = 'email', metadata = {} } = data;
    
    // Save in-app notification record if recipientId exists
    let notification = null;
    if (recipientId) {
      notification = await Notification.create({
        recipient: recipientId,
        title,
        message,
        type,
        metadata,
        tenantId: data.tenantId || 'uwu-main',
      }).catch(err => logger.error('Failed to save in-app notification:', err.message));
    }

    // Dispatch email if recipientEmail exists
    if (recipientEmail) {
      const setupUrl = metadata.setupUrl || '';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f766e; margin-top: 0;">UWU Smart Procurement System</h2>
          <h3 style="color: #1e293b;">${title}</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">${message}</p>
          ${setupUrl ? `
            <div style="margin: 28px 0; text-align: center;">
              <a href="${setupUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Setup Supplier Login Account
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${setupUrl}" style="color: #0d9488;">${setupUrl}</a></p>
          ` : ''}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Uva Wellassa University of Sri Lanka — Supplies Division Operations</p>
        </div>
      `;

      await emailService.sendEmail({
        to: recipientEmail,
        subject: title,
        html: htmlContent,
        text: `${message}\n\nAccount Setup Link: ${setupUrl}`,
      }).catch(err => {
        logger.warn(`Email dispatch notice for ${recipientEmail}: ${err.message} (Note: Real email delivery requires SMTP_USER and SMTP_PASS in .env)`);
      });
    }

    return notification;
  }
}

module.exports = new NotificationService();
