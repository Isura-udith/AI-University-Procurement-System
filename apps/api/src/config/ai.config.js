/**
 * AI Configuration — Enhanced
 * Google Gemini API configuration + all prompt templates, thresholds, and scoring parameters.
 */
const env = require('./env');

const aiConfig = {
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    baseUrl: env.GEMINI_API_BASE_URL,
    maxTokens: 8192,
    temperature: 0.3,
  },

  // Procurement-specific AI parameters
  analysis: {
    priceAnomalyThreshold: 0.65,          // 65% deviation triggers "High Price Anomaly Alert"
    collusionPValueThreshold: 0.05,        // p < 0.05 for bid clustering
    riskScoreWeights: {
      priceDeviation: 0.30,
      vendorHistory: 0.25,
      deliveryTimeliness: 0.20,
      specRestrictiveness: 0.15,
      documentCompleteness: 0.10,
    },
    vendorScoringWeights: {
      priceCompetitiveness: 0.20,
      deliveryTimeliness: 0.20,
      qualityRating: 0.20,
      complianceScore: 0.20,
      completionRate: 0.10,
      transactionHistory: 0.10,
    },
    comparativeAnalysisWeights: {
      price: 40,
      warranty: 15,
      delivery: 25,
      financial: 20,
    },
    multiCriteriaScoringDefaults: {
      price: 40,
      technicalCompliance: 40,
      delivery: 20,
    },
  },

  // Prompt templates for procurement domain
  prompts: {
    specAnalysis: 'Analyze the following procurement specification and extract: item categories, estimated quantities, quality requirements, compliance standards, and suggest appropriate procurement method (NCB/ICB/Shopping) based on estimated value.',
    bidEvaluation: 'Evaluate the following bid submission against the tender requirements. Score each criterion and provide a detailed technical assessment with justification.',
    priceIntelligence: 'Analyze the pricing data for the following procurement items. Compare against historical prices, identify anomalies, and provide market benchmarking.',
    vendorAssessment: 'Assess the following vendor profile based on past performance, financial stability, compliance history, and capacity. Provide a risk-adjusted score.',
    fraudDetection: 'Analyze the following set of bids for patterns indicating potential collusion, bid rigging, or artificial price inflation. Look for statistical clustering, sequential numbering, and unusual patterns.',
    nlpParsing: 'Parse the free-form requisition text and extract structured procurement data including items, categories, specifications, quantities, and estimated costs.',
    marketMonitoring: 'Monitor macroeconomic indicators affecting procurement categories. Analyze exchange rates, inflation, commodity prices, and supply chain factors relevant to Sri Lankan university procurement.',
    riskScoring: 'Calculate a procurement risk score based on price deviation, vendor history, delivery patterns, specification restrictiveness, and document completeness.',
    demandForecasting: 'Predict procurement demand based on historical consumption patterns, academic calendar, and seasonal factors for Uva Wellassa University.',
  },

  // Governance rules
  governance: {
    humanInTheLoop: true,              // AI cannot make autonomous decisions
    explainabilityRequired: true,      // Every AI output must have an explainability log
    auditTrailEnabled: true,           // All AI actions logged to MongoDB
    maxConfidenceLevel: 'recommendation', // AI can only "recommend", never "decide"
  },
};

module.exports = aiConfig;
