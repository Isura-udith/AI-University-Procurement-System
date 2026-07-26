/**
 * Final Master Plan (FMP) Model
 * Created from approved Draft Procurement Items.
 * Approval workflow: HOD → Dean → Bursar → Finance Committee → VC → Council → Active
 * Only items from Active FMPs can create Procurement Requests.
 */
const mongoose = require('mongoose');

const fmpItemSchema = new mongoose.Schema({
  draftItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'DraftProcurementItem' },
  description: { type: String, required: true },
  department: { type: String, required: true },
  faculty: { type: String, required: true },
  category: { type: String, enum: ['Goods', 'Services', 'Works', 'Consulting'], required: true },
  dappNumber: { type: String, trim: true },
  estimatedQuantity: Number,
  unit: String,
  estimatedUnitCost: Number,
  estimatedTotalCost: { type: Number, required: true },
  plannedYear: { type: Number, enum: [1, 2, 3], default: 1 },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  fundingSource: { type: String, default: 'Recurrent Budget' },
  justification: String,
  // Track if a procurement request has been created from this item
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  procurementCreated: { type: Boolean, default: false },
});

const fmpApprovalStageSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['bursar', 'finance_committee', 'vice_chancellor', 'council'],
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'info_requested'], default: 'pending' },
  comments: String,
  actionDate: Date,
  estimatedBudget: Number,
});

const finalMasterPlanSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  referenceNumber: { type: String, unique: true },

  title: { type: String, required: true },
  description: String,

  // Planning year
  planYear: { type: Number, required: true, default: () => new Date().getFullYear() },

  // Items imported from approved draft procurement items
  items: [fmpItemSchema],

  // Financial summary
  totalEstimatedBudget: Number,
  bursarEstimatedBudget: Number,
  approvedBudgetCeiling: Number,

  // Approval workflow
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'hod_review',
      'hod_approved',
      'dean_review',
      'dean_approved',
      'bursar_review',
      'bursar_approved',
      'finance_committee_review',
      'finance_committee_approved',
      'vc_review',
      'vc_approved',
      'council_review',
      'council_approved',
      'active',
      'rejected',
      'archived',
    ],
    default: 'draft',
  },

  approvalChain: [fmpApprovalStageSchema],

  // Created by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: String,
  faculty: String,

  submittedAt: Date,
  activatedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

finalMasterPlanSchema.index({ tenantId: 1, status: 1 });
finalMasterPlanSchema.index({ tenantId: 1, planYear: 1 });
finalMasterPlanSchema.index({ tenantId: 1, faculty: 1, status: 1 });

finalMasterPlanSchema.pre('save', async function () {
  if (!this.referenceNumber) {
    const count = await mongoose.model('FinalMasterPlan').countDocuments({ tenantId: this.tenantId });
    this.referenceNumber = `UWU/FMP/${this.planYear}/${String(count + 1).padStart(3, '0')}`;
  }
  // Auto-compute total estimated budget from items
  if (this.items && this.items.length > 0) {
    this.totalEstimatedBudget = this.items.reduce((sum, item) => sum + (item.estimatedTotalCost || 0), 0);
  }
});

module.exports = mongoose.model('FinalMasterPlan', finalMasterPlanSchema);
