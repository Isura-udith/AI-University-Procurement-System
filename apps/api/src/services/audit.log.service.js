/**
 * Audit Log Service
 * Central service for recording and querying user audit trails.
 * All auth/user events flow through this service for persistent storage.
 */
const AuditLog = require('../models/audit.log.model');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

// Action → Category + Severity mapping
const ACTION_CONFIG = {
  LOGIN_SUCCESS:              { category: 'authentication', severity: 'info' },
  LOGIN_FAILED:               { category: 'authentication', severity: 'warning' },
  LOGOUT:                     { category: 'authentication', severity: 'info' },
  SESSION_EXPIRED:            { category: 'authentication', severity: 'info' },
  TOKEN_REFRESHED:            { category: 'authentication', severity: 'info' },
  PASSWORD_CHANGED:           { category: 'security',       severity: 'warning' },
  PASSWORD_RESET_REQUESTED:   { category: 'security',       severity: 'warning' },
  PASSWORD_RESET_COMPLETED:   { category: 'security',       severity: 'warning' },
  ACCOUNT_LOCKED:             { category: 'security',       severity: 'critical' },
  ACCOUNT_UNLOCKED:           { category: 'security',       severity: 'warning' },
  ACCOUNT_DEACTIVATED:        { category: 'security',       severity: 'critical' },
  ACCOUNT_ACTIVATED:          { category: 'security',       severity: 'warning' },
  USER_REGISTERED:            { category: 'user_management', severity: 'info' },
  PROFILE_UPDATED:            { category: 'user_management', severity: 'info' },
  ROLE_CHANGED:               { category: 'user_management', severity: 'warning' },
  MFA_ENABLED:                { category: 'security',       severity: 'info' },
  MFA_DISABLED:               { category: 'security',       severity: 'warning' },
  DELEGATION_STARTED:         { category: 'delegation',     severity: 'warning' },
  DELEGATION_ENDED:           { category: 'delegation',     severity: 'info' },
  USER_CREATED_BY_ADMIN:      { category: 'administrative', severity: 'info' },
  USER_DELETED_BY_ADMIN:      { category: 'administrative', severity: 'critical' },
  USER_ROLE_CHANGED_BY_ADMIN: { category: 'administrative', severity: 'warning' },
  BULK_USER_IMPORT:           { category: 'administrative', severity: 'warning' },
};

class AuditLogService {
  /**
   * Record an audit event.
   * @param {object} opts
   * @param {string} opts.action          - One of the ACTION enum values
   * @param {object} [opts.user]          - The user performing the action (from req.user)
   * @param {string} [opts.tenantId]      - Tenant context
   * @param {string} [opts.description]   - Human-readable description
   * @param {string} [opts.ipAddress]     - Request IP
   * @param {string} [opts.userAgent]     - Request User-Agent
   * @param {string} [opts.sessionId]     - Session identifier
   * @param {number} [opts.sessionDuration] - Duration in seconds (for logout)
   * @param {object} [opts.metadata]      - Additional data
   * @param {object} [opts.targetUser]    - Target user (admin actions)
   * @param {string} [opts.status]        - success/failure/blocked
   * @param {string} [opts.failureReason] - Reason for failure
   */
  async log(opts) {
    try {
      const config = ACTION_CONFIG[opts.action] || { category: 'authentication', severity: 'info' };

      const logEntry = {
        tenantId: opts.tenantId || opts.user?.tenantId || 'uwu-main',
        userId: opts.user?._id || opts.userId,
        userEmail: opts.user?.email || opts.userEmail,
        userName: opts.user ? `${opts.user.firstName} ${opts.user.lastName}` : opts.userName,
        userRole: opts.user?.role || opts.userRole,
        action: opts.action,
        category: config.category,
        severity: config.severity,
        description: opts.description || this._generateDescription(opts.action, opts.user, opts.targetUser),
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        sessionId: opts.sessionId,
        sessionDuration: opts.sessionDuration,
        metadata: opts.metadata || {},
        targetUserId: opts.targetUser?._id || opts.targetUserId,
        targetUserEmail: opts.targetUser?.email || opts.targetUserEmail,
        status: opts.status || 'success',
        failureReason: opts.failureReason,
      };

      const auditLog = await AuditLog.create(logEntry);

      logger.debug('Audit log recorded', {
        action: opts.action,
        userId: logEntry.userId,
        status: logEntry.status,
      });

      return auditLog;
    } catch (err) {
      // Never let audit logging break the main flow
      logger.error('Failed to record audit log', { error: err.message, action: opts.action });
      return null;
    }
  }

  /**
   * Query audit logs with pagination and filters.
   */
  async query(query, tenantId) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };

    // Filter by action
    if (query.action) filters.action = query.action;

    // Filter by category
    if (query.category) filters.category = query.category;

    // Filter by severity
    if (query.severity) filters.severity = query.severity;

    // Filter by user
    if (query.userId) filters.userId = query.userId;

    // Filter by status
    if (query.status) filters.status = query.status;

    // Date range filter
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.$lte = new Date(query.endDate);
    }

    // Search by email or IP
    if (query.search) {
      filters.$or = [
        { userEmail: { $regex: query.search, $options: 'i' } },
        { userName: { $regex: query.search, $options: 'i' } },
        { ipAddress: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filters)
        .populate('userId', 'firstName lastName email role department avatar')
        .populate('targetUserId', 'firstName lastName email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get audit statistics for the dashboard.
   */
  async getStats(tenantId) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      todayLogins,
      todayFailedLogins,
      todayLogouts,
      last7DaysLogs,
      securityEvents,
      byAction,
      byCategory,
      recentCritical,
      activeUsersToday,
      loginsByHour,
    ] = await Promise.all([
      AuditLog.countDocuments({ tenantId }),
      AuditLog.countDocuments({ tenantId, action: 'LOGIN_SUCCESS', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ tenantId, action: 'LOGIN_FAILED', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ tenantId, action: 'LOGOUT', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ tenantId, createdAt: { $gte: last7Days } }),
      AuditLog.countDocuments({ tenantId, severity: 'critical', createdAt: { $gte: last30Days } }),

      // Breakdown by action (last 30 days)
      AuditLog.aggregate([
        { $match: { tenantId, createdAt: { $gte: last30Days } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Breakdown by category
      AuditLog.aggregate([
        { $match: { tenantId, createdAt: { $gte: last30Days } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      // Recent critical events
      AuditLog.find({ tenantId, severity: 'critical' })
        .sort('-createdAt')
        .limit(10)
        .populate('userId', 'firstName lastName email role')
        .lean(),

      // Unique active users today
      AuditLog.distinct('userId', { tenantId, action: 'LOGIN_SUCCESS', createdAt: { $gte: today } }),

      // Login distribution by hour (last 7 days)
      AuditLog.aggregate([
        { $match: { tenantId, action: 'LOGIN_SUCCESS', createdAt: { $gte: last7Days } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { '_id': 1 } },
      ]),
    ]);

    return {
      overview: {
        totalLogs,
        todayLogins,
        todayFailedLogins,
        todayLogouts,
        last7DaysLogs,
        securityEvents,
        activeUsersToday: activeUsersToday.length,
      },
      byAction,
      byCategory,
      recentCritical,
      loginsByHour,
    };
  }

  /**
   * Get login/logout timeline for a specific user.
   */
  async getUserTimeline(userId, tenantId, query = {}) {
    const { page, limit, skip } = getPagination(query);
    const filters = {
      tenantId,
      userId,
      action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED'] },
    };

    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.$lte = new Date(query.endDate);
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filters).sort('-createdAt').skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Auto-generate human-readable descriptions.
   */
  _generateDescription(action, user, targetUser) {
    const name = user ? `${user.firstName} ${user.lastName}` : 'Unknown user';
    const targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : '';

    const descriptions = {
      LOGIN_SUCCESS:              `${name} logged in successfully`,
      LOGIN_FAILED:               `Failed login attempt for ${user?.email || 'unknown email'}`,
      LOGOUT:                     `${name} logged out`,
      SESSION_EXPIRED:            `Session expired for ${name}`,
      TOKEN_REFRESHED:            `Token refreshed for ${name}`,
      PASSWORD_CHANGED:           `${name} changed their password`,
      PASSWORD_RESET_REQUESTED:   `Password reset requested for ${user?.email || 'unknown email'}`,
      PASSWORD_RESET_COMPLETED:   `Password reset completed for ${user?.email || 'unknown email'}`,
      ACCOUNT_LOCKED:             `Account locked for ${user?.email || 'unknown email'} after too many failed attempts`,
      ACCOUNT_UNLOCKED:           `Account unlocked for ${name}`,
      ACCOUNT_DEACTIVATED:        `Account deactivated for ${targetName || name}`,
      ACCOUNT_ACTIVATED:          `Account activated for ${targetName || name}`,
      USER_REGISTERED:            `${name} registered a new account`,
      PROFILE_UPDATED:            `${name} updated their profile`,
      ROLE_CHANGED:               `Role changed for ${targetName || name}`,
      MFA_ENABLED:                `${name} enabled multi-factor authentication`,
      MFA_DISABLED:               `${name} disabled multi-factor authentication`,
      DELEGATION_STARTED:         `${name} delegated authority to ${targetName}`,
      DELEGATION_ENDED:           `Delegation ended for ${name}`,
      USER_CREATED_BY_ADMIN:      `${name} created user account for ${targetName}`,
      USER_DELETED_BY_ADMIN:      `${name} deleted user account for ${targetName}`,
      USER_ROLE_CHANGED_BY_ADMIN: `${name} changed role for ${targetName}`,
      BULK_USER_IMPORT:           `${name} performed bulk user import`,
    };

    return descriptions[action] || `${name} performed ${action}`;
  }
}

module.exports = new AuditLogService();
