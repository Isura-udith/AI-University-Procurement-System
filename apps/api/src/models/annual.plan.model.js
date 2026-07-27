/**
 * Annual Procurement Plan Model
 * Phase 2 & 3: Annual Planning + External Budget Approval
 * Derived from a Master Procurement Plan (MPP) for one specific year.
 * Tracks the full approval chain including UGC → Treasury → Parliament.
 */
const mongoose = require('mongoose');

const annualItemSchema = new mongoose.Schema({
  masterPlanRequirementId: mongoose.Schema.Types.ObjectId, // Reference to MPP requirement
  dappNumber: { type: String, trim: true },                // DAPP reference number e.g. UWU/DAPP/2026/001
  department: { type: String, required: true },
  faculty: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Goods', 'Services', 'Works', 'Consulting'], required: true },
  estimatedQuantity: Number,
  unit: String,
  estimatedUnitCost: Number,
  estimatedTotalCost: { type: Number, required: true },
  allocatedBudget: Number,    // Filled after approval
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  quarter: { type: Number, enum: [1, 2, 3, 4] }, // Planned procurement quarter
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' }, // Linked actual procurement
});

const internalApprovalSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['dean', 'bursar', 'finance_committee', 'vice_chancellor', 'council'],
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comments: String,
  actionDate: Date,
});

const externalApprovalSchema = new mongoose.Schema({
  body: {
    type: String,
    enum: ['ugc', 'treasury', 'parliament'],
    required: true,
  },
  status: { type: String, enum: ['not_submitted', 'submitted', 'approved', 'rejected', 'revision_requested'], default: 'not_submitted' },
  submittedAt: Date,
  approvedAt: Date,
  referenceNumber: String,   // External reference number from UGC/Treasury/Parliament
  allocatedAmount: Number,   // Amount approved at this level
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
});

const annualPlanSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  referenceNumber: { type: String, unique: true },

  // Link to parent MPP
  masterPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterPlan', required: true },
  masterPlanRef: String, // e.g. UWU/MPP/2025-2028/001

  // Which year of the 3-year cycle
  planYear: { type: Number, required: true },      // e.g. 2026
  cycleYearNumber: { type: Number, enum: [1, 2, 3] }, // Year 1, 2, or 3 of cycle

  title: { type: String, required: true },
  description: String,

  // Procurement items for this year
  items: [annualItemSchema],

  // Financial Summary
  totalBudgetRequest: Number,       // Total requested
  totalAllocatedBudget: Number,     // Final allocation received (after Parliament)
  budgetConfirmed: { type: Boolean, default: false },
  budgetConfirmedAt: Date,
  budgetConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Phase 3: Internal Approval Chain (Dean → Bursar → Finance Committee → VC → Council)
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',                      // Submitted by HOD/Procurement Officer
      'dean_review', 'dean_approved',
      'bursar_review', 'bursar_approved',
      'finance_committee_review', 'finance_committee_approved',
      'vc_review', 'vc_approved',
      'council_review', 'council_approved',
      // Phase 3: External approval loop
      'ugc_submitted', 'ugc_approved',
      'treasury_submitted', 'treasury_approved',
      'parliament_submitted', 'parliament_approved',
      // Phase 4: Internal distribution
      'budget_received',                // University received the budget
      'distribution_in_progress',
      'distribution_complete',
      'rejected',
      'archived',
    ],
    default: 'draft',
  },

  internalApprovals: [internalApprovalSchema],
  externalApprovals: [externalApprovalSchema],

  // Created by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Linked budget allocations (Phase 4)
  budgetAllocationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BudgetAllocation' }],

  submittedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

annualPlanSchema.index({ tenantId: 1, status: 1 });
annualPlanSchema.index({ tenantId: 1, planYear: 1 });
annualPlanSchema.index({ tenantId: 1, masterPlanId: 1 });

annualPlanSchema.pre('save', async function () {
  if (this.items && this.items.length > 0) {
    this.totalBudgetRequest = this.items.reduce((sum, i) => {
      const qty = Number(i.estimatedQuantity) || 1;
      const unitCost = Number(i.estimatedUnitCost) || 0;
      const total = Number(i.estimatedTotalCost) || (qty * unitCost);
      return sum + total;
    }, 0);
  }
  if (!this.referenceNumber) {
    const count = await mongoose.model('AnnualPlan').countDocuments({ tenantId: this.tenantId, planYear: this.planYear });
    this.referenceNumber = `UWU/DAPP/${this.planYear}/${String(count + 1).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('AnnualPlan', annualPlanSchema);
