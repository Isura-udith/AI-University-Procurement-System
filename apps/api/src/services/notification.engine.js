/**
 * Notification Engine
 * Central orchestrator for all notification dispatch: in-app (Socket.IO),
 * email (BullMQ queue), idempotency checks, digest eligibility, and priority routing.
 */
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/notification.model');
const { emitToUser, emitToRole } = require('../config/socket');
const { addJob, QUEUES } = require('../config/queue');
const { checkIdempotencyKey } = require('../config/redis');
const { renderTemplate } = require('./email.templates');
const { sendEmail } = require('./email.service');
const logger = require('../config/logger');

// Notification types that bypass digest and send immediately
const IMMEDIATE_TYPES = new Set([
  'sla_escalation', 'appeal_filed', 'budget_overrun',
  'compliance_anomaly', 'debriefing_requested',
  'contract_awarded', 'intention_to_award',
]);

// High-priority executive roles that get digest treatment for routine items
const EXECUTIVE_ROLES = new Set(['vc', 'bursar', 'dean', 'super_admin']);

class NotificationEngine {
  /**
   * Send a notification through all configured channels.
   * @param {object} opts
   * @param {string} opts.tenantId
   * @param {string} opts.recipientId - User ObjectId
   * @param {string} opts.recipientEmail
   * @param {string} opts.recipientRole
   * @param {string} opts.type - Notification type enum
   * @param {string} opts.title
   * @param {string} opts.message
   * @param {string} [opts.priority='normal']
   * @param {string} [opts.severity='info']
   * @param {string} [opts.category='workflow']
   * @param {string} [opts.referenceType]
   * @param {string} [opts.referenceId]
   * @param {string} [opts.link]
   * @param {number} [opts.workflowStage]
   * @param {object} [opts.metadata={}]
   * @param {object} [opts.channels={inApp:true,email:false}]
   * @param {string} [opts.createdBy]
   * @param {string} [opts.idempotencyKey] - Auto-generated if not provided
   */
  async send(opts) {
    const {
      tenantId, recipientId, recipientEmail, recipientRole,
      type, title, message,
      priority = 'normal', severity = 'info', category = 'workflow',
      referenceType, referenceId, link,
      workflowStage, metadata = {},
      channels = { inApp: true, email: false },
      createdBy,
    } = opts;

    // Generate idempotency key
    const idempotencyKey = opts.idempotencyKey || `${type}:${recipientId}:${referenceId || ''}:${Date.now()}`;

    // Check idempotency
    const isDuplicate = await checkIdempotencyKey(idempotencyKey);
    if (isDuplicate) {
      logger.debug('Duplicate notification discarded', { idempotencyKey, type });
      return null;
    }

    // Determine digest eligibility
    const isDigestEligible = this._shouldDigest(type, priority, recipientRole);

    // Create notification record
    const notification = await Notification.create({
      tenantId,
      recipient: recipientId,
      recipientRole,
      recipientEmail,
      type, title, message,
      priority, severity, category,
      referenceType, referenceId, link,
      workflowStage,
      channels,
      isDigestEligible,
      idempotencyKey,
      metadata,
      createdBy,
    });

    // 1) In-app real-time push via Socket.IO
    if (channels.inApp) {
      emitToUser(recipientId, 'notification:new', {
        _id: notification._id,
        type, title, message,
        priority, severity, category,
        referenceType, referenceId, link,
        workflowStage,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    // 2) Email dispatch
    if (channels.email && recipientEmail && !isDigestEligible) {
      await this._dispatchEmail(notification, metadata);
    }

    logger.debug('Notification sent', {
      id: notification._id, type, recipient: recipientId,
      channels, isDigestEligible, priority,
    });

    return notification;
  }

  /**
   * Send notifications to multiple recipients at once.
   */
  async sendBulk(recipientsList, commonOpts) {
    const results = [];
    for (const recipient of recipientsList) {
      try {
        const result = await this.send({
          ...commonOpts,
          recipientId: recipient.userId || recipient._id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          idempotencyKey: `${commonOpts.type}:${recipient.userId || recipient._id}:${commonOpts.referenceId || ''}:${Date.now()}`,
        });
        results.push(result);
      } catch (err) {
        logger.error('Bulk notification failed for recipient', {
          recipientId: recipient.userId || recipient._id,
          error: err.message,
        });
      }
    }
    return results;
  }

  /**
   * Dispatch email via BullMQ queue or direct send as fallback.
   */
  async _dispatchEmail(notification, metadata) {
    const emailData = {
      to: notification.recipientEmail,
      subject: notification.title,
      html: renderTemplate(notification.type, {
        ...metadata,
        title: notification.title,
        message: notification.message,
        link: notification.link,
      }),
      notificationId: notification._id.toString(),
    };

    // Try queue first
    const job = await addJob(QUEUES.EMAIL_NOTIFICATION, 'send-email', emailData, {
      priority: notification.priority === 'urgent' ? 1 : notification.priority === 'high' ? 2 : 5,
    });

    if (job) {
      await Notification.findByIdAndUpdate(notification._id, { emailJobId: job.id });
    } else {
      // Fallback: send directly if queue is unavailable
      try {
        await sendEmail(emailData);
        await Notification.findByIdAndUpdate(notification._id, {
          emailSent: true, emailSentAt: new Date(),
        });
      } catch (err) {
        await Notification.findByIdAndUpdate(notification._id, {
          emailError: err.message,
        });
        logger.error('Direct email send failed', { error: err.message });
      }
    }
  }

  /**
   * Determine if a notification should be batched into a daily digest.
   * Executives get digest treatment for routine items; urgent always bypasses.
   */
  _shouldDigest(type, priority, role) {
    if (IMMEDIATE_TYPES.has(type)) return false;
    if (priority === 'urgent' || priority === 'high') return false;
    if (EXECUTIVE_ROLES.has(role) && priority === 'normal') return true;
    return false;
  }
}

module.exports = new NotificationEngine();
