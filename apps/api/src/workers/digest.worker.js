/**
 * Digest Worker - BullMQ background processor
 * Aggregates digest-eligible notifications and sends consolidated daily email.
 */
const { createWorker, QUEUES } = require('../config/queue');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { sendEmail } = require('../services/email.service');
const { renderTemplate } = require('../services/email.templates');
const logger = require('../config/logger');
const env = require('../config/env');

const initDigestWorker = () => {
  return createWorker(QUEUES.DAILY_DIGEST, async (job) => {
    const { tenantId } = job.data;
    logger.info('Processing daily digest', { tenantId });

    // Find all unsent digest-eligible notifications
    const pending = await Notification.find({
      tenantId,
      isDigestEligible: true,
      digestSentAt: null,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();

    if (pending.length === 0) {
      logger.info('No digest items to send');
      return { sent: 0 };
    }

    // Group by recipient
    const grouped = {};
    for (const n of pending) {
      const rid = n.recipient.toString();
      if (!grouped[rid]) grouped[rid] = [];
      grouped[rid].push(n);
    }

    let sentCount = 0;
    const colorMap = { approval: '#3b82f6', financial: '#f59e0b', tender: '#8b5cf6', workflow: '#059669', compliance: '#ef4444', contract: '#06b6d4', system: '#64748b' };

    for (const [recipientId, notifications] of Object.entries(grouped)) {
      const user = await User.findById(recipientId).select('email firstName').lean();
      if (!user?.email) continue;

      const items = notifications.map(n => ({
        title: n.title,
        message: n.message,
        color: colorMap[n.category] || '#059669',
      }));

      const html = renderTemplate('daily_digest', {
        items,
        dashboardLink: `${env.CLIENT_URL}/dashboard`,
        recipientName: user.firstName,
      });

      try {
        await sendEmail({
          to: user.email,
          subject: `📋 Daily Procurement Digest — ${new Date().toLocaleDateString('en-GB')}`,
          html,
        });

        // Mark as sent
        const ids = notifications.map(n => n._id);
        await Notification.updateMany({ _id: { $in: ids } }, {
          digestSentAt: new Date(),
          digestBatchId: job.id,
        });

        sentCount++;
      } catch (err) {
        logger.error('Digest send failed', { recipientId, error: err.message });
      }
    }

    logger.info('Daily digest complete', { tenantId, recipients: sentCount, notifications: pending.length });
    return { sent: sentCount, total: pending.length };
  }, { concurrency: 1 });
};

module.exports = { initDigestWorker };
