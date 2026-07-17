/**
 * AI Explainability Log Model
 * Stores detailed audit trails for every AI-generated recommendation.
 *
 * Governance Rule 2: Model Explainability and Audit Trail
 * Every risk score, price warning, or vendor ranking must be accompanied
 * by a log detailing exact weights, historical prices, and data sources.
 */
const mongoose = require('mongoose');

const aiExplainabilityLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'uwu-main', index: true },

  // Which AI feature generated this log
  aiFeature: {
    type: String,
    required: true,
    enum: [
      'NLP_REQUISITION_PARSING',
      'MARKET_PRICE_RECOMMENDATION',
      'SELLER_PRICE_VERIFICATION',
      'SMART_DECISION_SUPPORT',
      'DYNAMIC_MARKET_MONITORING',
      'PROCUREMENT_RISK_SCORING',
      'COMPARATIVE_QUOTATION_ANALYSIS',
      'HISTORICAL_PROCUREMENT_MATCH',
      'DEMAND_FORECASTING',
      'AI_VENDOR_ASSESSMENT',
      'SPEC_ANALYSIS',
      'BID_EVALUATION',
      'FRAUD_DETECTION',
      'BUDGET_FORECAST',
      'INTERACTIVE_AI_CHAT',
    ],
    index: true,
  },

  // Input data that triggered the AI analysis
  inputSummary: { type: String },
  inputData: { type: mongoose.Schema.Types.Mixed },

  // Model details
  model: { type: String, default: 'gemini-2.0-flash' },
  temperature: { type: Number },
  promptUsed: { type: String },

  // Weights and parameters used
  weightsApplied: { type: mongoose.Schema.Types.Mixed },
  thresholdsUsed: { type: mongoose.Schema.Types.Mixed },
  scoringFormula: { type: String },

  // Data sources consulted
  dataSources: [{ type: String }],

  // Output
  outputSummary: { type: String },
  outputData: { type: mongoose.Schema.Types.Mixed },

  // Processing metrics
  processingTimeMs: { type: Number },

  // References
  procurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procurement' },
  tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Who triggered it
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Disclaimer
  disclaimer: {
    type: String,
    default: 'AI-generated recommendation only. Final decisions must be made by authorized human officers per GOSL regulations.',
  },

}, { timestamps: true });

aiExplainabilityLogSchema.index({ tenantId: 1, aiFeature: 1, createdAt: -1 });
aiExplainabilityLogSchema.index({ tenantId: 1, procurementId: 1 });
aiExplainabilityLogSchema.index({ tenantId: 1, tenderId: 1 });

module.exports = mongoose.model('AIExplainabilityLog', aiExplainabilityLogSchema);
