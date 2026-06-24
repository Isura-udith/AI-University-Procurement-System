/**
 * Audit Log Model
 * Tamper-proof, append-only log of all user activities.
 * Records: login, logout, password changes, profile updates, failed logins,
 * account lockouts, session events, and administrative actions.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'uwu-main',
    index: true,
  },

  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userEmail: { type: String },
  userName: { type: String },
  userRole: { type: String },

  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'SESSION_EXPIRED',
      'TOKEN_REFRESHED',

      // Account security events
      'PASSWORD_CHANGED',
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'ACCOUNT_DEACTIVATED',
      'ACCOUNT_ACTIVATED',

      // User management events
      'USER_REGISTERED',
      'PROFILE_UPDATED',
      'ROLE_CHANGED',
      'MFA_ENABLED',
      'MFA_DISABLED',

      // Delegation events
      'DELEGATION_STARTED',
      'DELEGATION_ENDED',

      // Administrative events
      'USER_CREATED_BY_ADMIN',
      'USER_DELETED_BY_ADMIN',
      'USER_ROLE_CHANGED_BY_ADMIN',
      'BULK_USER_IMPORT',
    ],
    index: true,
  },

  // Action category for filtering
  category: {
    type: String,
    enum: ['authentication', 'security', 'user_management', 'delegation', 'administrative'],
    required: true,
    index: true,
  },

  // Severity level
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },

  // Action description
  description: { type: String },

  // Request context
  ipAddress: { type: String },
  userAgent: { type: String },
  geoLocation: {
    country: String,
    city: String,
    region: String,
  },

  // Session tracking
  sessionId: { type: String },
  sessionDuration: { type: Number }, // in seconds, for logout events

  // Additional metadata (varies by action type)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Target user (for admin actions on other users)
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUserEmail: { type: String },

  // Result of the action
  status: {
    type: String,
    enum: ['success', 'failure', 'blocked'],
    default: 'success',
  },

  // Failure reason (if applicable)
  failureReason: { type: String },

}, {
  timestamps: true,
  // Prevent modifications after creation
  strict: true,
});

// Compound indexes for common query patterns
auditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, category: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// TTL index: auto-delete logs older than 2 years (configurable)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Block update operations to maintain tamper-proof integrity
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable and cannot be modified.');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable and cannot be modified.');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable and cannot be modified.');
});

auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit logs cannot be deleted manually.');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs cannot be deleted manually.');
});

auditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit logs cannot be deleted manually.');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
