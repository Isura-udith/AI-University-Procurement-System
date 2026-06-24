/**
 * Notification Model - Enhanced
 * Supports real-time in-app alerts, email dispatch tracking, idempotency,
 * digest batching, priority routing, and full procurement lifecycle coverage.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },

  // Recipient targeting
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientRole: { type: String },
  recipientEmail: { type: String },

  // Notification content
  type: {
    type: String,
    enum: [
      // Stage 1: Requisition
      'requisition_submitted', 'requisition_confirmed',
      // Stage 2: Department clearance
      'hod_approval_required', 'hod_approved', 'hod_rejected',
      // Stage 3: Dean approval
      'dean_approval_required', 'dean_approved',
      // Stage 4: Finance verification
      'budget_verification_required', 'budget_locked',
      // Stage 5: Bidding document
      'tec_review_required', 'bidding_docs_approved',
      // Stage 6: Publication
      'tender_published', 'supplier_invitation',
      // Stage 7: Bid submission
      'bid_submission_confirmed', 'bid_received',
      // Stage 8: Bid opening
      'bid_opening_complete', 'bid_opening_published',
      // Stage 9: Evaluation
      'technical_accepted', 'technical_rejected',
      // Stage 10: Award
      'intention_to_award', 'standstill_started',
      // Stage 11: Debriefing
      'debriefing_requested', 'appeal_filed',
      // Stage 12: Contract
      'contract_awarded', 'contract_active',
      // Stage 13: Delivery
      'three_way_match', 'goods_accepted',
      // Advanced
      'sla_warning', 'sla_escalation',
      'deadline_reminder', 'debriefing_deadline',
      'daily_digest',
      'budget_overrun', 'compliance_anomaly',
      'approval_required', 'approval_granted', 'approval_rejected',
      'evaluation_complete', 'award_notice',
      'contract_signed', 'delivery_received', 'payment_processed',
      'ai_alert', 'system', 'budget_alert', 'vendor_update',
      'escalation',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Priority and severity
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info',
  },

  // Category for digest grouping
  category: {
    type: String,
    enum: ['workflow', 'approval', 'tender', 'financial', 'contract', 'compliance', 'system'],
    default: 'workflow',
  },

  // Reference to source entity
  referenceType: {
    type: String,
    enum: ['procurement', 'tender', 'bid', 'contract', 'payment', 'vendor', 'user', 'system'],
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  link: { type: String },

  // Workflow stage mapping
  workflowStage: { type: Number, min: 1, max: 13 },

  // Status tracking
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },

  // Email dispatch
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
  },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
  emailJobId: { type: String },
  emailError: { type: String },

  // Idempotency
  idempotencyKey: { type: String, unique: true, sparse: true },

  // Digest batching
  isDigestEligible: { type: Boolean, default: false },
  digestBatchId: { type: String },
  digestSentAt: { type: Date },

  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Expiry — auto-cleanup old notifications
  expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
}, {
  timestamps: true,
});

// Indexes for efficient querying
notificationSchema.index({ tenantId: 1, recipient: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isDigestEligible: 1, digestSentAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ tenantId: 1, recipient: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
