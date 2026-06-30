/**
 * Budget Allocation Model
 * Phase 4: Internal Budget Distribution
 * After Parliament approves budget → University → VC → Finance Committee → Bursar → Dean → HOD
 */
const mongoose = require('mongoose');

const departmentAllocationSchema = new mongoose.Schema({
  faculty: { type: String, required: true },
  department: { type: String, required: true },
  hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  allocatedAmount: { type: Number, required: true },
  consumedAmount: { type: Number, default: 0 },
  remainingAmount: Number,
  allocationDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'exhausted', 'suspended'], default: 'active' },
  notes: String,
});

const budgetAllocationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  referenceNumber: { type: String, unique: true },

  // Linked plans
  annualPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnnualPlan', required: true },
  budgetYear: { type: Number, required: true },

  // Total university budget for this year
  totalUniversityBudget: { type: Number, required: true },
  procurementBudget: { type: Number, required: true }, // Portion allocated for procurement

  // Distribution chain status
  distributionStatus: {
    type: String,
    enum: [
      'vc_distributed',             // VC distributed to Finance Committee
      'finance_committee_verified', // Finance Committee verified & forwarded
      'bursar_confirmed',           // Bursar confirmed allocations
      'dean_notified',              // Deans notified of faculty allocations
      'hod_notified',               // HODs notified of department allocations
      'complete',
    ],
    default: 'vc_distributed',
  },

  // Per-department allocations
  departmentAllocations: [departmentAllocationSchema],

  // Totals
  totalAllocated: Number,
  totalConsumed: { type: Number, default: 0 },
  totalRemaining: Number,

  // Distribution chain
  distributedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // VC
  distributedAt: Date,
  verifiedByBursar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,

  notes: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

budgetAllocationSchema.index({ tenantId: 1, budgetYear: 1 });
budgetAllocationSchema.index({ tenantId: 1, annualPlanId: 1 });

budgetAllocationSchema.pre('save', async function () {
  if (!this.referenceNumber) {
    const count = await mongoose.model('BudgetAllocation').countDocuments({ tenantId: this.tenantId, budgetYear: this.budgetYear });
    this.referenceNumber = `UWU/BUDGET/${this.budgetYear}/${String(count + 1).padStart(3, '0')}`;
  }
  // Compute totals
  if (this.departmentAllocations && this.departmentAllocations.length > 0) {
    this.totalAllocated = this.departmentAllocations.reduce((sum, d) => sum + (d.allocatedAmount || 0), 0);
    this.totalConsumed = this.departmentAllocations.reduce((sum, d) => sum + (d.consumedAmount || 0), 0);
    this.totalRemaining = this.totalAllocated - this.totalConsumed;
    // Compute per-department remaining
    this.departmentAllocations.forEach(d => {
      d.remainingAmount = (d.allocatedAmount || 0) - (d.consumedAmount || 0);
    });
  }
});

module.exports = mongoose.model('BudgetAllocation', budgetAllocationSchema);
