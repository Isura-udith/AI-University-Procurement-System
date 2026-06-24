/**
 * Market Alert Model
 * Stores AI-generated market monitoring alerts for the Supplies Division dashboard.
 * Feature 5: AI Dynamic Market Monitoring
 */
const mongoose = require('mongoose');

const marketAlertSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },

  alertType: {
    type: String,
    required: true,
    enum: ['forex_impact', 'inflation_spike', 'commodity_surge', 'supply_chain', 'seasonal', 'policy_change'],
  },

  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  affectedCategory: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  predictedImpact: { type: String },
  recommendation: { type: String },
  timeframe: { type: String, enum: ['immediate', 'short_term', 'medium_term', 'long_term'] },

  // Supporting data
  data: { type: mongoose.Schema.Types.Mixed },
  marketSummary: { type: mongoose.Schema.Types.Mixed },

  // Status
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },

  actionTaken: { type: String },
  isActive: { type: Boolean, default: true },

  // AI source
  explainabilityLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIExplainabilityLog' },

}, { timestamps: true });

marketAlertSchema.index({ tenantId: 1, isActive: 1, severity: 1 });
marketAlertSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketAlert', marketAlertSchema);
