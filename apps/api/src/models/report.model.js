/**
 * Report Model - Compliance reports and document management
 */
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },
  reportType: { type: String, enum: ['procurement_performance', 'compliance', 'spend_analysis', 'vendor_performance', 'budget_utilization', 'audit_trail', 'annual', 'quarterly', 'custom'], required: true },
  title: { type: String, required: true },
  description: String,
  period: { startDate: Date, endDate: Date, quarter: Number, year: Number },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['generating', 'ready', 'submitted', 'archived'], default: 'generating' },
  data: { type: mongoose.Schema.Types.Mixed },
  document: { url: String, format: { type: String, enum: ['pdf', 'xlsx', 'csv'] }, hash: String, size: Number },
  submittedTo: { type: String, enum: ['national_procurement_commission', 'auditor_general', 'treasury', 'internal'] },
  submittedAt: Date,
  // Version control
  version: { type: Number, default: 1 },
  previousVersions: [{ version: Number, document: String, generatedAt: Date }],
}, { timestamps: true });

reportSchema.index({ tenantId: 1, reportType: 1 });

module.exports = mongoose.model('Report', reportSchema);
