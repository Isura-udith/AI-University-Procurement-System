/**
 * Vendor Model
 * SRM with self-service onboarding, AI scoring, and GOSL compliance.
 */
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companyName: { type: String, required: true },
  tradingName: String,
  registrationNumber: { type: String, required: true },
  vatNumber: String,
  cidaGrade: String,
  cidaCertificate: String,
  businessType: { type: String, enum: ['Sole Proprietor', 'Partnership', 'Private Limited', 'Public Limited', 'State Enterprise', 'Foreign'] },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  website: String,
  address: { street: String, city: String, district: String, province: String, postalCode: String, country: { type: String, default: 'Sri Lanka' } },
  supplierCategories: [{ type: String }],
  status: { type: String, enum: ['pending', 'verified', 'preferred', 'blacklisted', 'suspended', 'inactive', 'rejected'], default: 'pending' },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accountSetupToken: String,
  accountSetupExpires: Date,
  accountSetupEmailSentAt: Date,
  kycDocuments: [{ docType: String, name: String, url: String, uploadedAt: { type: Date, default: Date.now }, verified: { type: Boolean, default: false }, expiryDate: Date }],
  bankDetails: { bankName: String, branchName: String, accountNumber: String, accountName: String, swiftCode: String },
  performanceScore: { type: Number, default: 0, min: 0, max: 100 },
  metrics: { deliveryTimeliness: { type: Number, default: 0 }, qualityRating: { type: Number, default: 0 }, priceCompetitiveness: { type: Number, default: 0 }, complianceScore: { type: Number, default: 0 }, totalContracts: { type: Number, default: 0 }, completedContracts: { type: Number, default: 0 }, totalContractValue: { type: Number, default: 0 } },
  isDebarred: { type: Boolean, default: false },
  debarmentDetails: { reason: String, debarredFrom: Date, debarredUntil: Date, authority: String },
  nationalDebarmentChecked: { type: Boolean, default: false },
  lastDebarmentCheck: Date,
  bidHistory: [{ tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' }, bidAmount: Number, result: { type: String, enum: ['won', 'lost', 'disqualified', 'pending'] }, submittedAt: Date }],
  aiAssessment: { overallRisk: String, riskFactors: [String], lastAssessedAt: Date, recommendation: String, biasCheckPassed: Boolean },
  internalNotes: [{ note: String, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

vendorSchema.index({ tenantId: 1, status: 1 });
vendorSchema.index({ tenantId: 1, companyName: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
