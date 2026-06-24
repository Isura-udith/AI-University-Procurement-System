/**
 * Message Model
 * Supports direct messaging between users, role-based announcements,
 * system/workflow alerts, categories, and threading (replies).
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'uwu-main',
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recipientRole: {
    type: String,
    enum: [
      'super_admin', 'admin', 'vc', 'dean', 'bursar',
      'finance_officer', 'procurement_officer', 'contract_manager',
      'tec_member', 'department_head', 'department_user',
      'store_manager', 'supplier', 'auditor', 'guest',
    ],
  },
  type: {
    type: String,
    enum: ['alert', 'supplier', 'announcement', 'message'],
    default: 'message',
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Workflow', 'Supplier', 'Announcement', 'Financial', 'General'],
    default: 'General',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  referenceType: {
    type: String,
    enum: ['procurement', 'tender', 'contract', 'payment', 'vendor'],
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
});

// Indexes for fast lookup
messageSchema.index({ tenantId: 1, recipient: 1, isRead: 1 });
messageSchema.index({ tenantId: 1, sender: 1 });
messageSchema.index({ tenantId: 1, recipientRole: 1 });
messageSchema.index({ replyTo: 1 });

module.exports = mongoose.model('Message', messageSchema);
