/**
 * Logger Configuration
 * Structured logging for audit trail compliance (Auditor-General requirements).
 */
const env = require('./env');

const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

const currentLevel = env.isDev() ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta.tenantId && { tenantId: meta.tenantId }),
    ...(meta.userId && { userId: meta.userId }),
    ...(meta.action && { action: meta.action }),
    ...(meta.ip && { ip: meta.ip }),
    ...(meta.resource && { resource: meta.resource }),
    ...meta,
  };
  return JSON.stringify(logEntry);
};

const logger = {
  error: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.ERROR) console.error(formatLog('ERROR', message, meta));
  },
  warn: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.WARN) console.warn(formatLog('WARN', message, meta));
  },
  info: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.INFO) console.log(formatLog('INFO', message, meta));
  },
  debug: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) console.log(formatLog('DEBUG', message, meta));
  },
  audit: (action, userId, meta) => {
    console.log(formatLog('AUDIT', `${action} by ${userId}`, { action, userId, ...meta }));
  },
};

module.exports = logger;
