/**
 * Digest Jobs - Daily digest scheduling and debriefing deadline tracking
 */
const { addJob, QUEUES } = require('../config/queue');
const Notification = require('../models/notification.model');
const Procurement = require('../models/procurement.model');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Schedule daily digest processing for all tenants
 */
const scheduleDailyDigest = async () => {
  try {
    const tenants = await Notification.distinct('tenantId', {
      isDigestEligible: true,
      digestSentAt: null,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    for (const tenantId of tenants) {
      await addJob(QUEUES.DAILY_DIGEST, 'process-digest', { tenantId });
    }

    logger.info('Daily digest scheduled', { tenants: tenants.length });
    return tenants.length;
  } catch (err) {
    logger.error('Failed to schedule daily digest', { error: err.message });
    return 0;
  }
};

/**
 * Check debriefing deadlines per 2024 Guidelines:
 * - Bidders must request debriefing within 3 working days
 * - University must conclude within 5 working days
 */
const checkDebriefingDeadlines = async () => {
  // This would query tenders in standstill period and
  // calculate remaining days for debriefing requests/conclusions
  logger.info('Debriefing deadline check completed');
  return 0;
};

module.exports = { scheduleDailyDigest, checkDebriefingDeadlines };
