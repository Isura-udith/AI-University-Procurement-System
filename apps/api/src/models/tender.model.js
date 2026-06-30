/**
 * Tender Model - e-Tendering & e-Bidding Platform
 */
const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement', required: true },
  tenderNumber: { type: String, unique: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['Goods', 'Services', 'Works', 'Consulting'] },
  procurementMethod: { type: String, enum: ['NCB', 'ICB', 'Shopping', 'Direct', 'RFQ', 'Limited'] },
  estimatedValue: Number,
  currency: { type: String, default: 'LKR' },
  status: { type: String, enum: ['draft', 'published', 'bidding', 'bid_closed', 'closed', 'opening', 'evaluation', 'awarded', 'loa_issued', 'standstill', 'cleared', 'appealed', 'cancelled', 'failed'], default: 'draft' },
  // Publication
  publishedOn: [{ type: String, enum: ['uwu_website', 'egp_portal', 'newspaper', 'gazette'] }],
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Timeline
  bidSubmissionDeadline: { type: Date, required: true },
  bidOpeningDate: Date,
  clarificationDeadline: Date,
  evaluationDeadline: Date,
  standstillEndDate: Date,
  // Bid Security
  bidSecurityRequired: { type: Boolean, default: true },
  bidSecurityAmount: Number,
  bidSecurityPercentage: Number,
  bidSecurityValidityDays: { type: Number, default: 180 },
  // Documents
  tenderDocuments: [{ name: String, url: String, type: String, uploadedAt: { type: Date, default: Date.now } }],
  documentFee: Number,
  // Evaluation Criteria
  evaluationType: { type: String, enum: ['lowest_price', 'quality_cost_based', 'quality_based', 'fixed_budget', 'consultant_qualification'], default: 'lowest_price' },
  technicalCriteria: [{ criterion: String, maxScore: Number, weight: Number }],
  technicalPassMark: { type: Number, default: 70 },
  // Committees
  becMembers: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['chairperson', 'member', 'secretary'] }, coiDeclared: { type: Boolean, default: false } }],
  bocMembers: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String }],
  // Bid Box
  bidBoxLocked: { type: Boolean, default: true },
  bidBoxClosedAt: Date,
  bidBoxOpenedAt: Date,
  bidBoxOpenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Pre-bid
  preBidMeetingDate: Date,
  clarifications: [{ question: String, answer: String, askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, answeredAt: Date, isPublic: { type: Boolean, default: true } }],
  // Addenda
  addenda: [{ number: Number, description: String, document: String, issuedAt: Date, issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  engineersEstimate: Number,
  // Award tracking
  awardedVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  awardedBidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  awardDate: Date,
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  awardAmount: Number,
  // LOA (Letter of Acceptance/Award)
  loaIssuedAt: Date,
  loaIssuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loaDocument: String,
  // Standstill period
  standstillStartDate: Date,
  standstillEndDate: Date,
  // Cancellation tracking
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Appeals
  appeals: [{
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    reason: String,
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'under-review', 'resolved', 'dismissed'], default: 'pending' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolutionNotes: String,
  }],
  // Debriefing requests
  debriefingRequests: [{
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'scheduled', 'completed', 'declined'], default: 'pending' },
    reason: String,
    scheduledDate: Date,
  }],
  // Bid opening ceremony
  bidOpeningCompletedAt: Date,
  bidOpeningCompletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bidOpeningMinutes: mongoose.Schema.Types.Mixed,
  // Feature 3: AI Smart Recommendations
  aiRecommendations: {
    bestPrice: { vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String, bidNumber: String, rationale: String, details: mongoose.Schema.Types.Mixed },
    bestValue: { vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String, bidNumber: String, rationale: String, details: mongoose.Schema.Types.Mixed },
    fastestDelivery: { vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String, bidNumber: String, rationale: String, details: mongoose.Schema.Types.Mixed },
    lowestRisk: { vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, vendorName: String, bidNumber: String, rationale: String, details: mongoose.Schema.Types.Mixed },
    aiSummary: mongoose.Schema.Types.Mixed,
    generatedAt: Date,
  },
  // Feature 7: Comparative Matrix
  comparativeMatrix: [{
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: String,
    compatibilityScore: Number,
    scores: { price: Number, technical: Number, delivery: Number, financial: Number },
  }],
  explainabilityLogIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIExplainabilityLog' }],
}, { timestamps: true });

tenderSchema.index({ tenantId: 1, status: 1 });
tenderSchema.index({ tenantId: 1, bidSubmissionDeadline: 1 });

tenderSchema.pre('save', async function () {
  if (!this.tenderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Tender').countDocuments({ tenantId: this.tenantId });
    this.tenderNumber = `TND-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Tender', tenderSchema);
