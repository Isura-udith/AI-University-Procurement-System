/**
 * Message Service
 * Database query operations for direct messaging, system notifications, and announcements.
 */
const Message = require('../models/message.model');
const User = require('../models/user.model');
const logger = require('../config/logger');

class MessageService {
  /** Create a new message */
  async create(data) {
    const message = await Message.create(data);
    return Message.findById(message._id)
      .populate('sender', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .populate('replyTo');
  }

  /**
   * Get all messages for a user (sent, received, or announcements matching their role).
   * Broadcast announcements (no recipientRole) are visible to ALL authenticated users.
   */
  async getForUser(userId, role, tenantId, query = {}) {
    // A message is relevant if:
    //   1. The user sent it
    //   2. The user is the direct recipient
    //   3. It's an announcement targeted at their role
    //   4. It's a broadcast announcement (no recipientRole set) — visible to everyone
    const baseOr = [
      { sender: userId },
      { recipient: userId },
      { type: 'announcement', recipientRole: role },
      { type: 'announcement', recipientRole: { $exists: false } },
      { type: 'announcement', recipientRole: null },
    ];

    const filters = { tenantId, $or: baseOr };

    // Unread-only filter
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filters.isRead = false;
      filters.sender = { $ne: userId };
    }

    if (query.category) {
      filters.category = query.category;
    }

    if (query.type) {
      if (query.type === 'inbox') {
        filters.recipient = userId;
        filters.sender = { $ne: userId };
      } else if (query.type === 'sent') {
        filters.sender = userId;
      } else if (query.type === 'announcement') {
        filters.type = 'announcement';
      } else if (query.type === 'alert') {
        filters.type = 'alert';
      } else if (query.type === 'supplier') {
        filters.type = 'supplier';
      } else if (query.type !== 'all') {
        filters.type = query.type;
      }
    }

    if (query.search) {
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [
          { subject: { $regex: query.search, $options: 'i' } },
          { body: { $regex: query.search, $options: 'i' } }
        ]
      });
    }

    const limit = Math.min(parseInt(query.limit) || 50, 100);
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Message.find(filters)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('sender', 'firstName lastName email role')
        .populate('recipient', 'firstName lastName email role')
        .populate('replyTo')
        .lean(),
      Message.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Mark message as read.
   * - For direct messages: only the actual recipient can mark it.
   * - For announcements/alerts without a specific recipient: any user can mark it read.
   */
  async markRead(messageId, userId) {
    const msg = await Message.findById(messageId).lean();
    if (!msg) return null;

    // Announcements / broadcast alerts — mark globally (no recipient field to filter on)
    if (msg.type === 'announcement' || (msg.type === 'alert' && !msg.recipient)) {
      return Message.findByIdAndUpdate(
        messageId,
        { isRead: true, readAt: new Date() },
        { new: true }
      ).populate('sender', 'firstName lastName email role')
       .populate('recipient', 'firstName lastName email role');
    }

    // Direct messages or targeted alerts — recipient must match
    return Message.findOneAndUpdate(
      { _id: messageId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    ).populate('sender', 'firstName lastName email role')
     .populate('recipient', 'firstName lastName email role');
  }

  /**
   * Get unread message count (includes broadcast announcements for everyone).
   */
  async getUnreadCount(userId, role, tenantId) {
    const unreadMessages = await Message.find({
      tenantId,
      isRead: false,
      sender: { $ne: userId },
      $or: [
        { recipient: userId },
        { type: 'announcement', recipientRole: role },
        { type: 'announcement', recipientRole: { $exists: false } },
        { type: 'announcement', recipientRole: null },
        { type: 'alert', recipient: userId },
      ]
    }, 'type').lean();

    return {
      all: unreadMessages.length,
      alerts: unreadMessages.filter(m => m.type === 'alert').length,
      supplier: unreadMessages.filter(m => m.type === 'supplier').length,
      announcements: unreadMessages.filter(m => m.type === 'announcement').length
    };
  }

  /** Delete message (only if sender or recipient) */
  async deleteMessage(messageId, userId) {
    return Message.findOneAndDelete({
      _id: messageId,
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    });
  }
}

module.exports = new MessageService();
