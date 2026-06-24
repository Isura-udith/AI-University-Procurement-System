/**
 * Vendor Ranking Engine
 * Multi-criteria vendor evaluation with weighted scoring formula.
 *
 * Scoring Formula: WeightedScore = Σ(Weight_i × Score_i)
 * Default weights: Price 40%, Technical Compliance 40%, Delivery 20%
 *
 * Governance: Every output includes an explainabilityLog object.
 */
const logger = require('../config/logger');

class VendorRankingEngine {
  constructor() {
    // Default multi-criteria weights (must total 100%)
    this.defaultWeights = {
      priceCompetitiveness: 0.20,
      deliveryTimeliness: 0.20,
      qualityRating: 0.20,
      complianceScore: 0.20,
      completionRate: 0.10,
      transactionHistory: 0.10,
    };
  }

  /**
   * Calculate a vendor's performance score using multi-criteria weighted scoring.
   *
   * @param {object} vendor – vendor document with metrics
   * @param {object} customWeights – optional custom weight overrides
   * @returns {object} { score, breakdown, tier }
   */
  calculateVendorScore(vendor, customWeights) {
    const weights = { ...this.defaultWeights, ...customWeights };
    const m = vendor.metrics || {};

    const completionRate = m.totalContracts > 0
      ? (m.completedContracts / m.totalContracts) * 100
      : 0;

    const transactionScore = Math.min(100, (m.totalContracts || 0) * 10);

    const scores = {
      priceCompetitiveness: Math.min(100, m.priceCompetitiveness || 0),
      deliveryTimeliness: Math.min(100, m.deliveryTimeliness || 0),
      qualityRating: Math.min(100, (m.qualityRating || 0) * 20),
      complianceScore: Math.min(100, m.complianceScore || 0),
      completionRate: Math.min(100, completionRate),
      transactionHistory: Math.min(100, transactionScore),
    };

    // Weighted Score = Σ(Weight_i × Score_i)
    let weightedScore = 0;
    const breakdown = {};
    for (const [criterion, weight] of Object.entries(weights)) {
      const rawScore = scores[criterion] || 0;
      const weighted = weight * rawScore;
      weightedScore += weighted;
      breakdown[criterion] = {
        rawScore: Math.round(rawScore),
        weight: weight * 100 + '%',
        weightedScore: Math.round(weighted * 10) / 10,
      };
    }

    const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore)));
    const tier = finalScore >= 85 ? 'Excellent'
      : finalScore >= 70 ? 'Good'
        : finalScore >= 50 ? 'Fair'
          : finalScore >= 30 ? 'Below Average'
            : 'Poor';

    return { score: finalScore, tier, breakdown };
  }

  /**
   * Rank vendors for a specific tender using multi-criteria scoring.
   *
   * @param {Array} vendors – vendor documents with metrics
   * @param {object} tenderRequirements – optional tender-specific requirements
   * @returns {Array} ranked vendor list
   */
  rankVendorsForTender(vendors, tenderRequirements) {
    const ranked = vendors.map(vendor => {
      const { score, tier, breakdown } = this.calculateVendorScore(vendor);

      return {
        vendorId: vendor._id,
        companyName: vendor.companyName,
        registrationNumber: vendor.registrationNumber,
        cidaGrade: vendor.cidaGrade,
        performanceScore: score,
        tier,
        breakdown,
        status: vendor.status,
        isDebarred: vendor.isDebarred,
        totalContracts: vendor.metrics?.totalContracts || 0,
        completedContracts: vendor.metrics?.completedContracts || 0,
        supplierCategories: vendor.supplierCategories,
      };
    });

    // Exclude debarred/blacklisted
    return ranked
      .filter(v => !v.isDebarred && v.status !== 'blacklisted')
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * AI-enhanced vendor assessment using Gemini.
   *
   * @param {object} vendor – vendor document
   * @param {object} aiService – injected AIService instance
   * @returns {object}
   */
  async getAIVendorAssessment(vendor, aiService) {
    const startTime = Date.now();
    const { score, tier, breakdown } = this.calculateVendorScore(vendor);

    const prompt = `Assess this vendor for Sri Lankan government procurement suitability.

VENDOR PROFILE:
Company: ${vendor.companyName}
Registration: ${vendor.registrationNumber}
CIDA Grade: ${vendor.cidaGrade || 'Not specified'}
Business Type: ${vendor.businessType || 'Unknown'}
Status: ${vendor.status}
Categories: ${(vendor.supplierCategories || []).join(', ')}

PERFORMANCE METRICS:
Performance Score: ${score}/100 (${tier})
Score Breakdown: ${JSON.stringify(breakdown, null, 2)}

Total Contracts: ${vendor.metrics?.totalContracts || 0}
Completed: ${vendor.metrics?.completedContracts || 0}
Total Contract Value: LKR ${(vendor.metrics?.totalContractValue || 0).toLocaleString()}

BID HISTORY:
${JSON.stringify((vendor.bidHistory || []).slice(-10), null, 2)}

KYC DOCUMENTS:
${JSON.stringify((vendor.kycDocuments || []).map(d => ({ type: d.docType, verified: d.verified, expiry: d.expiryDate })), null, 2)}

Return JSON:
{
  "overallRisk": "low|medium|high",
  "overallScore": number (0-100),
  "strengths": ["string"],
  "concerns": ["string"],
  "recommendation": "recommended|acceptable|needs_review|not_recommended",
  "creditProfile": "stable|moderate|unstable|unknown",
  "certificationStatus": "valid|expiring_soon|expired|missing",
  "disputeHistory": "none|minor|significant",
  "biasCheck": {
    "passed": boolean,
    "notes": "any bias concerns in the assessment"
  }
}`;

    try {
      const result = await aiService.callGemini(
        prompt,
        'You are a vendor risk assessment analyst ensuring fair, unbiased evaluation for GOSL procurement. Return ONLY valid JSON.'
      );

      let parsed;
      try {
        parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
      } catch {
        parsed = { raw: result };
      }

      parsed.performanceScore = score;
      parsed.tier = tier;
      parsed.scoreBreakdown = breakdown;
      parsed.explainabilityLog = {
        feature: 'AI_VENDOR_ASSESSMENT',
        vendorId: vendor._id?.toString(),
        calculatedScore: score,
        model: 'gemini-2.0-flash',
        processingTimeMs: Date.now() - startTime,
        dataSources: ['vendor-profile', 'performance-metrics', 'bid-history', 'kyc-documents', 'gemini-analysis'],
        weightsApplied: this.defaultWeights,
        timestamp: new Date().toISOString(),
      };

      return parsed;
    } catch (error) {
      logger.error('AI vendor assessment failed', { error: error.message, vendorId: vendor._id });
      return {
        overallRisk: 'unknown',
        overallScore: score,
        performanceScore: score,
        tier,
        scoreBreakdown: breakdown,
        recommendation: 'needs_review',
        error: 'AI assessment unavailable',
        explainabilityLog: {
          feature: 'AI_VENDOR_ASSESSMENT',
          vendorId: vendor._id?.toString(),
          error: error.message,
          fallback: 'statistical-only',
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

module.exports = new VendorRankingEngine();
