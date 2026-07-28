const mongoose = require('mongoose');

const procurementItemSchema = new mongoose.Schema({
  itemNumber: Number,
  description: { type: String, required: true },
  category: { type: String, enum: ['Goods', 'Services', 'Works', 'Consulting'], required: true },
  specifications: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  estimatedUnitPrice: { type: Number, required: true },
  estimatedTotalPrice: Number,
  budgetCode: String,                    // University vote code
  voteItem: String,                      // GOSL vote item classification
  deliveryTimeline: String,
  qualityStandards: String,
});

const approvalStageSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['hod', 'dean', 'bursar', 'finance_committee', 'vice_chancellor', 'procurement_committee', 'pmd', 'registrar', 'dpc', 'mpc', 'rpc', 'cab_com'],
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'escalated', 'delegated'], default: 'pending' },
  comments: String,
  actionDate: Date,
  delegatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  digitalSignature: String,              // Digital signature hash
  escalatedAt: Date,
  escalationReason: String,
});

const procurementSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },

  // Reference Number: UWU/{Category}/{Method}/{Year}/{Seq}
  referenceNumber: { type: String, unique: true },

  // Requisition Info
  title: { type: String, required: true },
  description: { type: String, required: true },
  justification: String,
  category: {
    type: String,
    enum: ['Goods', 'Services', 'Works', 'Consulting'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },

  // Items
  items: [procurementItemSchema],

  // Technical Specifications (vendors vote yes/no on each during bidding)
  technicalSpecifications: [{
    specNumber: Number,
    title: { type: String, required: true },
    description: String,
    isMandatory: { type: Boolean, default: true },
  }],

  // Financial
  totalEstimatedCost: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  vatInclusive: { type: Boolean, default: true },
  vatAmount: Number,

  // Bidding & Timeline Info from Frontend
  fundingSource: String,
  invitationDate: Date,
  bidClosingDate: Date,
  deliveryDate: Date,
  deliveryLocation: String,
  programCode: String,
  projectCode: String,
  objectItem: String,
  slicing: { type: Boolean, default: false },

  // Budget / DAPP Reference
  dappReference: String,
  mppReference: String,
  budgetYear: { type: Number, default: () => new Date().getFullYear() },
  budgetAllocated: Number,
  budgetConsumed: Number,
  budgetRemaining: Number,
  budgetValidated: { type: Boolean, default: false },
  budgetLockedAt: Date,

  // ── Automated Budget Compliance Check (populated on submit) ────
  budgetComplianceCheck: {
    checkedAt: Date,
    annualPlanPassed: { type: Boolean },
    budgetPassed: { type: Boolean },
    passed: { type: Boolean },
    annualPlanStatus: String,
    annualPlanRef: String,
    annualItemDesc: String,
    remainingBudget: Number,
    requiredBudget: Number,
    failureReason: {
      type: String,
      enum: [
        'no_annual_plan_linked',
        'plan_not_approved',
        'item_not_found',
        'insufficient_budget',
        'no_budget_allocated',
        null,
      ],
    },
    requiresSpecialApproval: { type: Boolean, default: false },
    overBudgetPercent: { type: Number, default: 0 },
  },

  // ── Workflow Linkage (45-Step Lifecycle) ──────────────────────
  annualPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnnualPlan' },
  annualPlanItemId: mongoose.Schema.Types.ObjectId,      // Specific item within the annual plan
  budgetAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'BudgetAllocation' },
  workflowStep: { type: Number, min: 1, max: 45, default: 27 }, // Current position in 45-step lifecycle
  approvalAuthority: {                                   // Value-based routing (Step 29)
    type: String,
    enum: ['dean', 'bursar', 'finance_committee', 'vice_chancellor', 'council', 'procurement_committee'],
  },

  // Procurement Method (determined by TCE)
  procurementMethod: {
    type: String,
    enum: ['NCB', 'ICB', 'Shopping', 'Direct', 'RFQ', 'Limited', 'Emergency'],
  },

  // Committee Assignment (based on TCE thresholds)
  assignedCommittee: {
    type: String,
    enum: ['DPC', 'MPC', 'RPC', 'CAB_COM'],
  },

  // Requestor
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: String,
  faculty: String,
  employeeId: String,
  empId: String,

  // Status
  status: {
    type: String,
    enum: [
      'draft', 'submitted', 'under_review',
      'hod_approved', 'dean_approved', 'pmd_approved',
      'bursar_approved', 'finance_committee_approved',
      'procurement_committee_approved', 'vc_approved', 'pmd_review',
      'budget_locked', 'committee_assigned',
      'tender_preparation', 'published', 'bidding',
      'evaluation', 'award_pending', 'standstill',
      'contract_signing', 'in_progress', 'delivery',
      'three_way_match', 'payment_pending', 'completed',
      'rejected', 'cancelled', 'on_hold',
      'flagged_special_approval',  // Over-budget within 10% grace — needs special approval
    ],
    default: 'draft',
  },
  currentStage: { type: Number, default: 1 },  // 1-15 lifecycle stages

  // Approval Chain
  approvalChain: [approvalStageSchema],
  lastEscalationCheck: Date,

  // AI Analysis
  aiAnalysis: {
    riskScore: Number,
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
    priceAnalysis: String,
    recommendedMethod: String,
    specificationSummary: String,
    budgetGuardResult: {
      passed: Boolean,
      message: String,
      analyzedAt: Date,
    },
    anomalyFlags: [{
      type: { type: String },
      severity: String,
      description: String,
      detectedAt: Date,
    }],
    // Feature 1: Market Price Recommendation
    marketPriceRecommendation: {
      priceBands: [{
        itemDescription: String,
        lowPrice: Number,
        midPrice: Number,
        highPrice: Number,
        confidence: String,
        reasoning: String,
      }],
      overallTCE: { lowEstimate: Number, midEstimate: Number, highEstimate: Number },
      marketConditions: String,
      analyzedAt: Date,
    },
    // Feature 4: NLP Parsed Data
    nlpParsedData: {
      suggestedTitle: String,
      suggestedJustification: String,
      identifiedSpecs: [String],
      parsedAt: Date,
    },
    // Feature 6: Risk Assessment
    riskAssessment: {
      factors: [{
        factor: String,
        weight: String,
        score: Number,
        detail: String,
        severity: String,
      }],
      aiRiskAnalysis: mongoose.Schema.Types.Mixed,
      assessedAt: Date,
    },
    // Feature 8: Historical Match
    historicalMatch: {
      matches: [{
        historicalRef: String,
        date: String,
        previousPrice: Number,
        previousVendor: String,
        relevanceScore: Number,
      }],
      priceDeviation: {
        currentEstimate: Number,
        historicalAverage: Number,
        deviationPercent: Number,
        assessment: String,
      },
      alerts: [{ type: { type: String }, severity: String, message: String }],
      matchedAt: Date,
    },
    // Governance: Explainability log references
    explainabilityLogIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIExplainabilityLog' }],
  },

  // Linked Entities
  tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },

  // Documents
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    hash: String,  // Cryptographic hash for tamper-proofing
  }],

  // Timeline
  submittedAt: Date,
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: String,

  // Version Control
  version: { type: Number, default: 1 },
  revisionHistory: [{
    version: Number,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: Date,
    changes: String,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
procurementSchema.index({ tenantId: 1, status: 1 });
procurementSchema.index({ tenantId: 1, requestedBy: 1 });
procurementSchema.index({ tenantId: 1, department: 1 });
procurementSchema.index({ tenantId: 1, referenceNumber: 1 });
procurementSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save: Generate reference number
procurementSchema.pre('save', async function () {
  if (!this.referenceNumber) {
    const year = new Date().getFullYear();
    const categoryCode = this.category === 'Goods' ? 'G' : this.category === 'Services' ? 'S' : this.category === 'Works' ? 'W' : 'C';
    const method = this.procurementMethod || 'NCB';
    const count = await mongoose.model('Procurement').countDocuments({ tenantId: this.tenantId, budgetYear: year });
    this.referenceNumber = `UWU/${categoryCode}/${method}/${year}/${String(count + 1).padStart(3, '0')}`;
  }

  // Calculate total
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.estimatedTotalPrice = item.quantity * item.estimatedUnitPrice;
    });
    this.totalEstimatedCost = this.items.reduce((sum, item) => sum + item.estimatedTotalPrice, 0);
  }

  // Determine procurement method based on TCE thresholds (2024 Guidelines)
  if (this.totalEstimatedCost && !this.procurementMethod) {
    const tce = this.totalEstimatedCost;
    if (this.category === 'Goods' || this.category === 'Services') {
      if (tce <= 500000) this.procurementMethod = 'Shopping';
      else if (tce <= 50000000) this.procurementMethod = 'NCB';
      else this.procurementMethod = 'ICB';
    } else if (this.category === 'Works') {
      if (tce <= 1000000) this.procurementMethod = 'Shopping';
      else if (tce <= 100000000) this.procurementMethod = 'NCB';
      else this.procurementMethod = 'ICB';
    }
  }

  // Determine committee based on TCE thresholds
  if (this.totalEstimatedCost) {
    const tce = this.totalEstimatedCost;
    if (tce > 1000000) {
      // Above 1,000,000 requires Procurement Committee. We use the existing sub-tiers or default to DPC
      if (tce <= 50000000) this.assignedCommittee = 'DPC';
      else if (tce <= 400000000) this.assignedCommittee = 'MPC';
      else if (tce <= 2000000000) this.assignedCommittee = 'RPC';
      else this.assignedCommittee = 'CAB_COM';
    } else {
      this.assignedCommittee = undefined; // No committee needed, VC or Dean is final authority
    }

    // Step 29: Determine approval authority based on procurement value
    if (tce <= 200000) this.approvalAuthority = 'finance_committee';
    else if (tce <= 500000) this.approvalAuthority = 'finance_committee';
    else if (tce <= 1000000) this.approvalAuthority = 'finance_committee';
    else this.approvalAuthority = 'council';
  }
});

module.exports = mongoose.model('Procurement', procurementSchema);
