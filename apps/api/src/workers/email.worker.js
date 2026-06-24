/**
 * Email Worker - BullMQ background processor
 * Processes queued email jobs asynchronously to prevent server degradation.
 */
const { createWorker, QUEUES } = require('../config/queue');
const { sendEmail } = require('../services/email.service');
const Notification = require('../models/notification.model');
const logger = require('../config/logger');

const initEmailWorker = () => {
  return createWorker(QUEUES.EMAIL_NOTIFICATION, async (job) => {
    const { to, subject, html, notificationId } = job.data;

    logger.debug('Processing email job', { jobId: job.id, to, subject });

    await sendEmail({ to, subject, html });

    // Update notification record
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        emailSent: true,
        emailSentAt: new Date(),
      });
    }

    return { sent: true, to, subject };
  }, {
    concurrency: 5,
    limiter: { max: 30, duration: 60000 },  // Max 30 emails per minute
  });
};

module.exports = { initEmailWorker };
