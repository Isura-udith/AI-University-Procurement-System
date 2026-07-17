/**
 * User Model
 * Enterprise IAM with RBAC/PBAC, multi-tenant support, MFA, and audit logging.
 * Supports: Department Users, Procurement Officers, Finance Officers, Approvers, Admins.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'uwu-main',
    index: true,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: [
      'super_admin',
      'admin',
      'vc',
      'dean',
      'bursar',
      'finance_officer',
      'procurement_officer',
      'contract_manager',
      'tec_member',
      'department_head',
      'department_user',
      'finance_committee',
      'procurement_committee',
      'store_manager',
      'supplier',
      'auditor',
      'guest',
    ],
    default: 'department_user',
  },
  permissions: [{
    type: String,
    enum: [
      // Requisitions
      'create_requisition', 'approve_requisition', 'reject_requisition',
      // Budget & Finance
      'verify_budget', 'manage_budget', 'three_way_match', 'process_payment',
      // Tendering
      'create_tender', 'publish_tender', 'open_bid_box', 'submit_bid', 'evaluate_bid',
      // Awards & Contracts
      'award_contract', 'sign_contract', 'sign_loa', 'submit_appeal', 'request_debriefing',
      // Inventory & GRN
      'record_grn', 'manage_inventory',
      // Vendors
      'manage_vendors',
      // Reports & AI
      'view_reports', 'ai_analysis',
      // Administration
      'manage_users', 'manage_mpp', 'manage_dapp', 'delegate_authority',
      // Public
      'view_public_notices',
    ],
  }],
  department: {
    type: String,
    enum: [
      'Medicine', 'Applied Sciences', 'Technological Studies',
      'Management', 'Animal Science', 'Science & Technology',
      'Procurement Management Division', 'Procurement Management Division (PMD)', 'Finance Division',
      'Registrar Office', 'Vice Chancellor Office', 'Supplies Division',
    ],
  },
  faculty: {
    type: String,
    enum: ['Medicine', 'Applied Sciences', 'Technological Studies', 'Management', 'Animal Science', 'Science & Technology'],
  },
  phone: { type: String },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },

  // MFA
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },

  // Delegation of Authority
  delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  delegationStart: Date,
  delegationEnd: Date,
  isDelegating: { type: Boolean, default: false },

  // Digital Signature
  digitalSignatureId: String,  // Digital signature integration
  signaturePublicKey: String,

  // Security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,

  // Conflict of Interest Declaration
  coiDeclarations: [{
    declarationDate: Date,
    details: String,
    relatedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    status: { type: String, enum: ['pending', 'reviewed', 'cleared'], default: 'pending' },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for multi-tenant queries
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, department: 1 });

// Virtual: Full Name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save: Hash password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
});

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method: Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Method: Check account lockout
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method: Check delegation status
userSchema.methods.getEffectiveUser = function () {
  if (this.isDelegating && this.delegatedTo && this.delegationStart <= new Date() && this.delegationEnd >= new Date()) {
    return this.delegatedTo;
  }
  return this._id;
};

module.exports = mongoose.model('User', userSchema);
