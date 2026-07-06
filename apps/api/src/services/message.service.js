/**
 * Message Service
 * Database query operations for direct messaging, system notifications, and announcements.
 *
 * Key design decisions:
 *  - Direct messages (type 'message' or targeted 'alert'/'supplier') use the single
 *    `isRead` boolean since there's exactly one recipient.
 *  - Broadcast messages (announcements without a specific recipient, or role-targeted
 *    announcements) use the `readBy` array for per-user read tracking so that one user
 *    marking a message as read doesn't affect other users.
 *  - `deletedBy` array lets users dismiss broadcasts from their inbox without
 *    affecting other users. Direct messages are hard-deleted.
 */
const Message = require('../models/message.model');
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
   * Determine whether a message is a "broadcast" (multi-user audience).
   * Broadcasts are announcements or alerts that have no specific `recipient` field.
   */
  _isBroadcast(msg) {
    return (msg.type === 'announcement') ||
           (msg.type === 'alert' && !msg.recipient);
  }

  /**
   * Get all messages for a user (sent, received, or announcements matching their role).
   * Returns each message with an `isReadByMe` virtual so the frontend knows per-user status.
   */
  async getForUser(userId, role, tenantId, query = {}) {
    const filters = { tenantId };

    // ------- Type / Tab filtering -------
    if (query.type === 'inbox') {
      // Inbox: messages TO the user + announcements visible to them
      filters.$or = [
        { recipient: userId, sender: { $ne: userId } },
        { type: 'announcement', recipientRole: role },
        { type: 'announcement', recipientRole: { $exists: false } },
        { type: 'announcement', recipientRole: null },
        { type: 'alert', recipient: userId, sender: { $ne: userId } },
      ];
    } else if (query.type === 'sent') {
      filters.sender = userId;
    } else if (query.type === 'announcement') {
      filters.type = 'announcement';
      // Only show announcements the user can see
      filters.$or = [
        { recipientRole: role },
        { recipientRole: { $exists: false } },
        { recipientRole: null },
        { sender: userId },
      ];
    } else if (query.type === 'alert') {
      filters.type = 'alert';
      filters.$or = [
        { recipient: userId },
        { sender: userId },
      ];
    } else if (query.type === 'supplier') {
      filters.type = 'supplier';
      filters.$or = [
        { recipient: userId },
        { sender: userId },
      ];
    } else {
      // 'all' or unrecognised — show everything the user can see
      filters.$or = [
        { sender: userId },
        { recipient: userId },
        { type: 'announcement', recipientRole: role },
        { type: 'announcement', recipientRole: { $exists: false } },
        { type: 'announcement', recipientRole: null },
      ];
    }

    // Exclude messages the user has soft-deleted
    if (query.type !== 'sent') {
      filters.deletedBy = { $ne: userId };
    }

    // Category filter
    if (query.category) {
      filters.category = query.category;
    }

    // Search filter
    if (query.search) {
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [
          { subject: { $regex: query.search, $options: 'i' } },
          { body: { $regex: query.search, $options: 'i' } },
        ],
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

    // Attach per-user `isReadByMe` for each message
    const enriched = data.map((msg) => {
      const isBroadcast = this._isBroadcast(msg);
      let isReadByMe;

      if (isBroadcast) {
        // Check the readBy array for this user
        isReadByMe = (msg.readBy || []).some(
          (r) => String(r.user) === String(userId)
        );
      } else {
        // Direct message — sender always counts as "read"
        if (String(msg.sender?._id || msg.sender) === String(userId)) {
          isReadByMe = true;
        } else {
          isReadByMe = !!msg.isRead;
        }
      }

      return { ...msg, isReadByMe };
    });

    return { data: enriched, total, page, limit };
  }

  /**
   * Mark message as read for a specific user.
   * - Broadcasts: push to readBy array (idempotent — skip if already present).
   * - Direct messages: set isRead = true (only if user is the recipient).
   */
  async markRead(messageId, userId) {
    const msg = await Message.findById(messageId).lean();
    if (!msg) return null;

    if (this._isBroadcast(msg)) {
      // Add user to readBy if not already there
      const alreadyRead = (msg.readBy || []).some(
        (r) => String(r.user) === String(userId)
      );
      if (!alreadyRead) {
        await Message.findByIdAndUpdate(messageId, {
          $push: { readBy: { user: userId, readAt: new Date() } },
        });
      }
      // Return the updated message with isReadByMe = true
      const updated = await Message.findById(messageId)
        .populate('sender', 'firstName lastName email role')
        .populate('recipient', 'firstName lastName email role')
        .lean();
      return { ...updated, isReadByMe: true };
    }

    // Direct message — only the recipient can mark it
    const updated = await Message.findOneAndUpdate(
      { _id: messageId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    )
      .populate('sender', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .lean();

    return updated ? { ...updated, isReadByMe: true } : null;
  }

  /**
   * Get unread message count for a user (per-user aware).
   */
  async getUnreadCount(userId, role, tenantId) {
    // 1. Unread DIRECT messages (isRead = false, user is recipient, not sender)
    const directUnread = await Message.find({
      tenantId,
      isRead: false,
      recipient: userId,
      sender: { $ne: userId },
      type: { $in: ['message', 'supplier', 'alert'] },
      deletedBy: { $ne: userId },
    }, '_id type').lean();

    // 2. Broadcast announcements visible to user that they haven't read
    const broadcastAnnouncements = await Message.find({
      tenantId,
      type: 'announcement',
      $or: [
        { recipientRole: role },
        { recipientRole: { $exists: false } },
        { recipientRole: null },
      ],
      'readBy.user': { $ne: userId },
      deletedBy: { $ne: userId },
    }, '_id type').lean();

    const allUnread = [...directUnread, ...broadcastAnnouncements];

    return {
      all: allUnread.length,
      alerts: allUnread.filter((m) => m.type === 'alert').length,
      supplier: allUnread.filter((m) => m.type === 'supplier').length,
      announcements: allUnread.filter((m) => m.type === 'announcement').length,
    };
  }

  /**
   * Delete / dismiss a message for a user.
   * - Direct messages: hard-delete if user is sender or recipient.
   * - Broadcasts: soft-delete by adding user to deletedBy array.
   */
  async deleteMessage(messageId, userId) {
    const msg = await Message.findById(messageId).lean();
    if (!msg) return null;

    if (this._isBroadcast(msg)) {
      // Soft-delete for the user — add to deletedBy
      return Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deletedBy: userId } },
        { new: true }
      );
    }

    // Direct message — hard delete if sender or recipient
    return Message.findOneAndDelete({
      _id: messageId,
      $or: [
        { sender: userId },
        { recipient: userId },
      ],
    });
  }
}

module.exports = new MessageService();
