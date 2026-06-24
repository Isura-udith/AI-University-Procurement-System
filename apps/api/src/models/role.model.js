/**
 * Role & Permission Model
 * Fine-grained permission management for the GOSL procurement hierarchy.
 */
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  permissions: [{
    resource: {
      type: String,
      enum: [
        'requisitions', 'approvals', 'budget', 'tenders', 'bids',
        'evaluations', 'awards', 'contracts', 'deliveries', 'payments',
        'vendors', 'reports', 'users', 'settings', 'ai_analysis',
        'mpp', 'dapp', 'notifications', 'audit_logs',
      ],
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'sign', 'publish', 'export'],
    }],
  }],
  hierarchy: { type: Number, default: 0 },  // Higher = more authority
  isSystem: { type: Boolean, default: false },  // Cannot be deleted
  maxApprovalAmount: { type: Number, default: 0 },  // LKR threshold
  committeeType: {
    type: String,
    enum: ['DPC', 'MPC', 'RPC', 'CAB_COM', 'none'],
    default: 'none',
  },
}, {
  timestamps: true,
});

roleSchema.index({ tenantId: 1, slug: 1 });

module.exports = mongoose.model('Role', roleSchema);
