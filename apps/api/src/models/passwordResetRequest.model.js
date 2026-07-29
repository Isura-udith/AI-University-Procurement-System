/**
 * Password Reset Request Model
 * Tracks user requests for password resets submitted to top-level admins.
 */
const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'uwu-main', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, index: true },
  userName: { type: String },
  userRole: { type: String },
  department: { type: String },
  reason: { type: String, default: 'Forgot Password Request' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  requestedAt: { type: Date, default: Date.now },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByName: { type: String },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedByName: { type: String },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  temporaryPassword: { type: String },
  adminNotes: { type: String },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
