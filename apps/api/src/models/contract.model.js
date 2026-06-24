/**
 * Contract Model - CLM with digital signature integration and lifecycle tracking
 */
const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement', required: true },
  tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
  bidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  contractNumber: { type: String, unique: true },
  title: { type: String, required: true },
  description: String,
  contractType: { type: String, enum: ['goods', 'services', 'works', 'consulting', 'framework'] },
  templateType: { type: String, enum: ['GOSL_Standard', 'GOSL_Works', 'GOSL_Consulting', 'Custom'] },
  // Financial
  contractValue: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  advancePayment: Number,
  retentionPercentage: { type: Number, default: 10 },
  paymentTerms: String,
  paymentSchedule: [{ milestone: String, amount: Number, dueDate: Date, status: { type: String, enum: ['pending', 'invoiced', 'paid'], default: 'pending' } }],
  // Timeline
  startDate: Date,
  endDate: Date,
  completionDate: Date,
  duration: Number,
  durationUnit: { type: String, enum: ['days', 'weeks', 'months'], default: 'months' },
  // Status
  status: { type: String, enum: ['draft', 'pending_signature', 'loa_issued', 'active', 'in_progress', 'completed', 'terminated', 'suspended', 'expired'], default: 'draft' },
  // Digital Signatures
  signatures: [{ signatory: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, signatureHash: String, signedAt: Date, signatureRef: String, verified: { type: Boolean, default: false } }],
  // Performance Security
  performanceSecurity: { type: { type: String, enum: ['bank_guarantee', 'insurance_bond'] }, amount: Number, document: String, expiryDate: Date, verified: { type: Boolean, default: false } },
  // SLA
  slaMetrics: [{ metric: String, target: String, actual: String, status: { type: String, enum: ['met', 'at_risk', 'breached'], default: 'met' } }],
  // Variations
  variations: [{ number: Number, description: String, amount: Number, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, status: { type: String, enum: ['pending', 'approved', 'rejected'] } }],
  totalVariationAmount: { type: Number, default: 0 },
  // Documents
  documents: [{ name: String, url: String, type: String, hash: String, uploadedAt: Date }],
  letterOfAcceptance: String,
  // Deliverables
  deliverables: [{ description: String, expectedDate: Date, deliveredDate: Date, status: { type: String, enum: ['pending', 'delivered', 'accepted', 'rejected'], default: 'pending' }, acceptanceReport: String }],
  // Award details
  awardDate: Date,
  standstillStartDate: Date,
  standstillEndDate: Date,
  intentionToAwardNotice: String,
  // Renewal
  isRenewable: { type: Boolean, default: false },
  renewalDate: Date,
  renewalNotice: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

contractSchema.index({ tenantId: 1, status: 1 });
contractSchema.index({ tenantId: 1, vendorId: 1 });
contractSchema.index({ tenantId: 1, endDate: 1 });

contractSchema.pre('save', async function () {
  if (!this.contractNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Contract').countDocuments({ tenantId: this.tenantId });
    this.contractNumber = `CNT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Contract', contractSchema);
