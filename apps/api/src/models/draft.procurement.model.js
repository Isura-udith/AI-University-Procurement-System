/**
 * Draft Procurement Plan Item Model
 * Stores draft procurement requirements submitted by any university user
 * before compiled into the official Master Procurement Plan.
 * Approval workflow: Draft -> Submitted (Dean Review) -> Dean Approved / Approved -> Merged to MPP
 */
const mongoose = require('mongoose');

const approvalStageSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['hod', 'dean', 'bursar', 'finance_committee', 'vice_chancellor', 'council', 'office'],
    default: 'hod',
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comments: String,
  actionDate: Date,
});

const draftProcurementItemSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  
  itemCode: { type: String, trim: true },               // DAPP reference number e.g. UWU/DAPP/2026/001
  description: { type: String, required: true },
  
  faculty: { type: String, required: true },
  department: { type: String, required: true },
  targetOffice: { type: String },                       // Specific university office if applicable
  
  category: { 
    type: String, 
    enum: ['Goods', 'Services', 'Works', 'Consulting'], 
    default: 'Goods' 
  },
  
  estimatedQuantity: { type: Number, default: 1 },
  unit: { type: String, default: 'Units' },
  estimatedUnitCost: { type: Number, default: 0 },
  estimatedTotalCost: { type: Number, default: 0 },
  
  plannedYear: { type: Number, default: 1 },
  year: { type: Number, default: 2028 },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical', 'Low', 'Medium', 'High', 'Critical'], 
    default: 'medium' 
  },
  
  fundingSource: { type: String, default: 'GOSL Treasury Funds' },
  
  // Quarterly breakdown (%)
  q1Amount: { type: Number, default: 100 },
  q2Amount: { type: Number, default: 0 },
  q3Amount: { type: Number, default: 0 },
  q4Amount: { type: Number, default: 0 },
  
  justification: { type: String },
  notes: { type: String },
  
  status: {
    type: String,
    enum: [
      'draft',
      'submitted_to_hod', 'hod_approved',
      'submitted_to_dean', 'dean_approved',
      'submitted_to_bursar', 'bursar_approved',
      'submitted_to_fc', 'fc_approved',
      'submitted_to_vc', 'vc_approved',
      'submitted_to_council', 'council_approved',
      'approved', 'rejected'
    ],
    default: 'draft',
    index: true,
  },
  
  approvalChain: [approvalStageSchema],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  masterPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterPlan' }, // Linked MPP once imported
  submittedAt: Date,
  approvedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

draftProcurementItemSchema.index({ tenantId: 1, department: 1, status: 1 });
draftProcurementItemSchema.index({ tenantId: 1, faculty: 1, status: 1 });
draftProcurementItemSchema.index({ createdBy: 1 });

draftProcurementItemSchema.pre('save', function () {
  if (!this.itemCode) {
    this.itemCode = `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  this.estimatedTotalCost = (Number(this.estimatedQuantity) || 0) * (Number(this.estimatedUnitCost) || 0);
});

module.exports = mongoose.model('DraftProcurementItem', draftProcurementItemSchema);
