/**
 * Payment Model - 3-Way Matching (PO, GRN, Invoice) and financial controls
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  paymentNumber: { type: String, unique: true },
  // 3-Way Matching
  purchaseOrder: { poNumber: String, poDate: Date, poAmount: Number, document: String },
  goodsReceivedNote: { grnNumber: String, grnDate: Date, receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, items: [{ description: String, orderedQty: Number, receivedQty: Number, acceptedQty: Number, rejectedQty: Number, reason: String }], inspectionReport: String, acceptanceCommitteeReport: String },
  invoice: { invoiceNumber: String, invoiceDate: Date, invoiceAmount: Number, vatAmount: Number, document: String },
  // Matching
  threeWayMatchStatus: { type: String, enum: ['pending', 'matched', 'discrepancy', 'resolved', 'override'], default: 'pending' },
  matchDiscrepancies: [{ field: String, poValue: String, grnValue: String, invoiceValue: String, resolution: String }],
  // Payment
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  paymentType: { type: String, enum: ['advance', 'progress', 'final', 'retention_release', 'variation'] },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cheque', 'lpo'] },
  status: { type: String, enum: ['pending_match', 'pending_approval', 'approved', 'processing', 'paid', 'rejected', 'cancelled'], default: 'pending_match' },
  // Approvals
  approvals: [{ approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, status: { type: String, enum: ['pending', 'approved', 'rejected'] }, actionDate: Date, comments: String }],
  // Deductions
  deductions: [{ description: String, amount: Number, type: { type: String, enum: ['retention', 'penalty', 'tax', 'advance_recovery', 'other'] } }],
  netAmount: Number,
  // Budget Impact
  budgetCode: String,
  voteItem: String,
  // Timeline
  dueDate: Date,
  paidAt: Date,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transactionRef: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: String,
}, { timestamps: true });

paymentSchema.index({ tenantId: 1, status: 1 });
paymentSchema.index({ tenantId: 1, vendorId: 1 });

paymentSchema.pre('save', async function () {
  if (!this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments({ tenantId: this.tenantId });
    this.paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  // Calculate net amount
  const totalDeductions = (this.deductions || []).reduce((sum, d) => sum + d.amount, 0);
  this.netAmount = this.amount - totalDeductions;
});

module.exports = mongoose.model('Payment', paymentSchema);
