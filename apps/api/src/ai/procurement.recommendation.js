const logger = require('../config/logger');
const aiConfig = require('../config/ai.config');

class ProcurementRecommendationEngine {
  /**
   * Generate all 4 recommendation types for a tender.
   *
   * @param {Array} bids – populated bid documents (with vendorId populated)
   * @param {object} tender – tender document with evaluation criteria
   * @param {Array} vendorAssessments – AI/statistical vendor assessments
   * @param {object} aiService – injected AIService instance
   * @returns {object} { bestPrice, bestValue, fastestDelivery, lowestRisk, summary, explainabilityLog }
   */
  async generateRecommendations(bids, tender, vendorAssessments, aiService) {
    const startTime = Date.now();

    if (!bids || bids.length === 0) {
      return {
        bestPrice: null,
        bestValue: null,
        fastestDelivery: null,
        lowestRisk: null,
        summary: 'No bids available for analysis.',
        humanInTheLoop: true,
        explainabilityLog: {
          feature: 'SMART_DECISION_SUPPORT',
          result: 'no_bids',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // --- 1. Best Price Recommendation ---
    const responsiveBids = bids.filter(b =>
      b.status !== 'non_responsive' && b.status !== 'withdrawn'
      && b.preliminaryExam?.result !== 'fail'
    );
    const sortedByPrice = [...responsiveBids].sort((a, b) => a.totalBidAmount - b.totalBidAmount);
    const bestPrice = sortedByPrice[0] ? this._formatRecommendation(
      sortedByPrice[0], 'BEST_PRICE',
      'Lowest responsive bid amount',
      { rank: 1, quotedAmount: sortedByPrice[0].totalBidAmount },
    ) : null;

    // --- 2. Best Value Recommendation (Quality-to-Price ratio) ---
    const withTechScores = responsiveBids
      .filter(b => b.technicalEvaluation?.totalScore != null)
      .map(b => {
        const techMax = b.technicalEvaluation.scores?.reduce((s, c) => s + c.maxScore, 0) || 100;
        const techPercent = (b.technicalEvaluation.totalScore / techMax) * 100;
        const priceNormalized = sortedByPrice[0]
          ? (sortedByPrice[0].totalBidAmount / b.totalBidAmount) * 100
          : 100;
        const qualityToPriceRatio = (techPercent * 0.6) + (priceNormalized * 0.4);
        return { ...b.toObject ? b.toObject() : b, techPercent, priceNormalized, qualityToPriceRatio };
      })
      .sort((a, b) => b.qualityToPriceRatio - a.qualityToPriceRatio);

    const bestValue = withTechScores[0] ? this._formatRecommendation(
      withTechScores[0], 'BEST_VALUE',
      'Highest quality-to-price ratio',
      {
        techScore: withTechScores[0].techPercent?.toFixed(1) + '%',
        qualityToPriceRatio: withTechScores[0].qualityToPriceRatio?.toFixed(1),
        quotedAmount: withTechScores[0].totalBidAmount,
      },
    ) : bestPrice; // fallback to best price if no tech scores

    // --- 3. Fastest Delivery Recommendation ---
    const vendorMap = {};
    vendorAssessments?.forEach(va => { vendorMap[va.vendorId?.toString()] = va; });

    const withDelivery = responsiveBids.map(b => {
      const vendorId = b.vendorId?._id?.toString() || b.vendorId?.toString();
      const assessment = vendorMap[vendorId];
      const deliveryScore = b.vendorId?.metrics?.deliveryTimeliness
        || assessment?.scoreBreakdown?.deliveryTimeliness?.rawScore
        || 50;
      return { ...b.toObject ? b.toObject() : b, deliveryScore };
    }).sort((a, b) => b.deliveryScore - a.deliveryScore);

    const fastestDelivery = withDelivery[0] ? this._formatRecommendation(
      withDelivery[0], 'FASTEST_DELIVERY',
      'Highest past performance for lead-time compliance',
      {
        deliveryScore: withDelivery[0].deliveryScore,
        quotedAmount: withDelivery[0].totalBidAmount,
      },
    ) : null;

    // --- 4. Lowest Risk Recommendation ---
    const withRisk = responsiveBids.map(b => {
      const vendorId = b.vendorId?._id?.toString() || b.vendorId?.toString();
      const assessment = vendorMap[vendorId];
      const vendor = b.vendorId || {};

      // Risk factors (lower = better)
      const hasCIDA = vendor.cidaGrade ? 1 : 0;
      const isVerified = vendor.status === 'verified' || vendor.status === 'preferred' ? 1 : 0;
      const hasHistory = (vendor.metrics?.totalContracts || 0) > 2 ? 1 : 0;
      const completionRate = vendor.metrics?.totalContracts > 0
        ? vendor.metrics.completedContracts / vendor.metrics.totalContracts
        : 0;
      const complianceScore = (vendor.metrics?.complianceScore || 0) / 100;

      const riskScore = (hasCIDA * 20) + (isVerified * 20) + (hasHistory * 20) +
        (completionRate * 20) + (complianceScore * 20);

      return {
        ...b.toObject ? b.toObject() : b,
        riskScore,
        riskLevel: riskScore >= 80 ? 'low' : riskScore >= 50 ? 'medium' : 'high',
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    const lowestRisk = withRisk[0] ? this._formatRecommendation(
      withRisk[0], 'LOWEST_RISK',
      'Most stable supplier with lowest procurement risk',
      {
        riskScore: withRisk[0].riskScore,
        riskLevel: withRisk[0].riskLevel,
        quotedAmount: withRisk[0].totalBidAmount,
      },
    ) : null;

    // --- AI Summary ---
    let aiSummary = null;
    if (aiService) {
      try {
        const prompt = `You are a BEC advisor for a Sri Lankan university procurement.
Summarize these 4 AI-generated recommendations for the committee:

1. BEST PRICE: ${bestPrice?.vendorName || 'N/A'} — LKR ${bestPrice?.details?.quotedAmount?.toLocaleString() || 'N/A'}
2. BEST VALUE: ${bestValue?.vendorName || 'N/A'} — QTP Ratio: ${bestValue?.details?.qualityToPriceRatio || 'N/A'}
3. FASTEST DELIVERY: ${fastestDelivery?.vendorName || 'N/A'} — Delivery Score: ${fastestDelivery?.details?.deliveryScore || 'N/A'}
4. LOWEST RISK: ${lowestRisk?.vendorName || 'N/A'} — Risk: ${lowestRisk?.details?.riskLevel || 'N/A'}

Provide a brief executive summary and overall recommendation. Remember: the final decision is ALWAYS made by the human BEC members.

Return JSON:
{
  "executiveSummary": "string",
  "overallRecommendation": "string",
  "keyTradeoffs": ["string"],
  "riskWarnings": ["string"]
}`;

        const result = await aiService.callGemini(prompt, 'You are a procurement advisor. Return ONLY valid JSON.');
        try {
          aiSummary = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
        } catch { aiSummary = { executiveSummary: result }; }
      } catch (err) {
        logger.warn('AI recommendation summary failed', { error: err.message });
      }
    }

    return {
      bestPrice,
      bestValue,
      fastestDelivery,
      lowestRisk,
      aiSummary,
      humanInTheLoop: true,
      governanceNotice: 'These are AI-generated recommendations only. Final contract award decisions must be made by the authorized Procurement Committee (RPC, DPC, MPC, or HLPC) per the Public Financial Management Act No. 44 of 2024.',
      explainabilityLog: {
        feature: 'SMART_DECISION_SUPPORT',
        tenderId: tender?._id?.toString(),
        bidsAnalyzed: bids.length,
        responsiveBids: responsiveBids.length,
        recommendations: {
          bestPrice: bestPrice?.vendorName,
          bestValue: bestValue?.vendorName,
          fastestDelivery: fastestDelivery?.vendorName,
          lowestRisk: lowestRisk?.vendorName,
        },
        model: `${aiConfig.gemini.model} + statistical`,
        processingTimeMs: Date.now() - startTime,
        dataSources: ['bid-submissions', 'technical-evaluations', 'vendor-metrics', 'gemini-analysis'],
        scoringFormulas: {
          bestPrice: 'min(totalBidAmount) where status != non_responsive',
          bestValue: '0.6 × techPercent + 0.4 × (minPrice/bidPrice × 100)',
          fastestDelivery: 'max(deliveryTimeliness)',
          lowestRisk: '20×CIDA + 20×Verified + 20×History + 20×CompletionRate + 20×Compliance',
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * @private
   */
  _formatRecommendation(bid, type, rationale, details) {
    return {
      type,
      vendorId: bid.vendorId?._id || bid.vendorId,
      vendorName: bid.vendorId?.companyName || 'Unknown',
      bidNumber: bid.bidNumber,
      rationale,
      details,
      confidence: 'high',
    };
  }
}

module.exports = new ProcurementRecommendationEngine();
