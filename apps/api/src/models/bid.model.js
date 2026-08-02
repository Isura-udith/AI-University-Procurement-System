/**
 * Bid Model - Digital Bid Box with encryption and evaluation scoring
 */
const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  bidNumber: { type: String, unique: true },
  // Financial Proposal
  totalBidAmount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  lineItems: [{ itemDescription: String, quantity: Number, unit: String, unitPrice: Number, totalPrice: Number }],
  vatAmount: Number,
  discountOffered: Number,
  // Technical Proposal
  technicalProposal: { methodology: String, timeline: String, teamComposition: String, experience: String },
  // Specification Votes (vendor votes yes/no on each procurement technical specification)
  specificationVotes: [{
    specNumber: Number,
    specTitle: String,
    vote: { type: String, enum: ['yes', 'no'], required: true },
    reason: String,   // Required when vote is 'no'
  }],
  // Bid Security
  bidSecurityType: { type: String, enum: ['bank_guarantee', 'insurance_bond', 'certified_cheque', 'demand_draft'] },
  bidSecurityAmount: Number,
  bidSecurityDocument: String,
  bidSecurityExpiryDate: Date,
  bidSecurityValid: { type: Boolean, default: false },
  // Status
  status: { type: String, enum: ['submitted', 'opened', 'preliminary_exam', 'technically_evaluated', 'financially_evaluated', 'substantially_responsive', 'non_responsive', 'awarded', 'rejected', 'withdrawn'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  openedAt: Date,
  // Documents
  documents: [{ name: String, url: String, type: { type: String }, hash: String, uploadedAt: { type: Date, default: Date.now } }],
  // Preliminary Examination
  preliminaryExam: { bidSecurityPresent: Boolean, formsSigned: Boolean, powerOfAttorney: Boolean, eligibilityMet: Boolean, majorDeviations: [String], result: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' }, examDate: Date, examBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  // Technical Evaluation
  technicalEvaluation: { scores: [{ criterion: String, maxScore: Number, givenScore: Number, justification: String }], totalScore: Number, passed: Boolean, notes: String, evaluatedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], evaluatedAt: Date },
  // Financial Evaluation
  financialEvaluation: { correctedBidAmount: Number, arithmeticErrors: [{ description: String, originalValue: Number, correctedValue: Number }], priceAdjustments: [{ description: String, amount: Number }], normalizedPrice: Number, evaluatedAt: Date },
  // AI Analysis
  aiAnalysis: {
    priceDeviation: Number,
    anomalyFlags: [String],
    riskScore: Number,
    comparisonToEstimate: Number,
    recommendation: String,
    // Feature 2: Seller Price Verification
    verificationResult: {
      isAnomaly: Boolean,
      anomalyType: { type: String, enum: ['overpriced', 'suspiciously_low', 'normal'] },
      deviationFromMean: String,
      deviationFromEstimate: String,
      verifiedAt: Date,
    },
    // Feature 7: Comparative Analysis Score
    comparativeScore: { type: Number, min: 0, max: 100 },
    scoreBreakdown: {
      price: Number,
      technical: Number,
      delivery: Number,
      financial: Number,
    },
    strengths: [String],
    weaknesses: [String],
  },
  // Ranking
  combinedScore: Number,
  rank: Number,
  // Integrity
  encryptionHash: String,
  isSealed: { type: Boolean, default: true },
}, { timestamps: true });

bidSchema.index({ tenantId: 1, tenderId: 1 });
bidSchema.index({ tenantId: 1, vendorId: 1 });

bidSchema.pre('validate', function () {
  // Auto-calculate line item totals
  if (this.lineItems && this.lineItems.length > 0) {
    this.lineItems.forEach(item => { item.totalPrice = item.quantity * item.unitPrice; });
    this.totalBidAmount = this.lineItems.reduce((sum, item) => sum + item.totalPrice, 0) + (this.vatAmount || 0) - (this.discountOffered || 0);
  }
});

bidSchema.pre('save', async function () {
  if (!this.bidNumber) {
    const count = await mongoose.model('Bid').countDocuments({ tenderId: this.tenderId });
    this.bidNumber = `BID-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
  }
  // Generate encryptionHash if sealed and not present
  if (this.isSealed && !this.encryptionHash) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      totalBidAmount: this.totalBidAmount,
      lineItems: this.lineItems?.map(i => ({ desc: i.itemDescription, qty: i.quantity, price: i.unitPrice })) || [],
      vendorId: this.vendorId,
      tenderId: this.tenderId,
      submittedAt: this.submittedAt,
    });
    this.encryptionHash = crypto.createHash('sha256').update(content).digest('hex');
  }
});

module.exports = mongoose.model('Bid', bidSchema);
