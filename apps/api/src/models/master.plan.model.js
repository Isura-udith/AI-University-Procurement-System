/**
 * Master Procurement Plan (MPP) Model
 * Phase 1: Strategic 3-Year Procurement Planning
 * HOD → Dean → Bursar → Finance Committee → VC → Council → Active
 */
const mongoose = require('mongoose');

const departmentRequirementSchema = new mongoose.Schema({
  department: { type: String, required: true },
  faculty: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Goods', 'Services', 'Works', 'Consulting'], required: true },
  dappNumber: { type: String, trim: true },               // DAPP reference number e.g. UWU/DAPP/2026/001
  estimatedQuantity: Number,
  unit: String,
  estimatedUnitCost: Number,
  estimatedTotalCost: { type: Number, required: true },
  plannedYear: { type: Number, enum: [1, 2, 3], required: true }, // Which year of the 3-year cycle
  justification: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
});

const mppApprovalStageSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['hod', 'dean', 'bursar', 'finance_committee', 'vice_chancellor', 'council'],
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'info_requested'], default: 'pending' },
  comments: String,
  actionDate: Date,
  estimatedBudget: Number, // Bursar fills this
});

const masterPlanSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  referenceNumber: { type: String, unique: true },

  title: { type: String, required: true },
  description: String,

  // 3-year cycle
  cycleStart: { type: Number, required: true }, // e.g. 2025
  cycleEnd: { type: Number, required: true },   // e.g. 2028

  // Department requirements aggregated across all faculties
  requirements: [departmentRequirementSchema],

  // Financial summary
  totalEstimatedBudget: Number,       // Computed from requirements
  bursarEstimatedBudget: Number,      // Filled by Bursar
  approvedBudgetCeiling: Number,      // Filled by Finance Committee / VC

  // Approval workflow
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',            // HOD submitted
      'dean_review',          // Awaiting Dean
      'dean_approved',
      'bursar_estimation',    // Awaiting Bursar cost estimation
      'bursar_approved',
      'finance_committee_review',
      'finance_committee_approved',
      'vc_review',
      'vc_approved',
      'council_review',
      'council_approved',     // Final — MPP is now active
      'active',               // Annual plans can be derived
      'rejected',
      'archived',
    ],
    default: 'draft',
  },

  approvalChain: [mppApprovalStageSchema],

  // Created by (HOD)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: String,
  faculty: String,

  // Linked annual plans
  annualPlanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AnnualPlan' }],

  submittedAt: Date,
  activatedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

masterPlanSchema.index({ tenantId: 1, status: 1 });
masterPlanSchema.index({ tenantId: 1, cycleStart: 1 });

masterPlanSchema.pre('save', async function () {
  if (!this.referenceNumber) {
    const count = await mongoose.model('MasterPlan').countDocuments({ tenantId: this.tenantId });
    this.referenceNumber = `UWU/MPP/${this.cycleStart}-${this.cycleEnd}/${String(count + 1).padStart(3, '0')}`;
  }
  // Auto-compute total estimated budget from requirements
  if (this.requirements && this.requirements.length > 0) {
    this.totalEstimatedBudget = this.requirements.reduce((sum, r) => sum + (r.estimatedTotalCost || 0), 0);
  }
});

module.exports = mongoose.model('MasterPlan', masterPlanSchema);
