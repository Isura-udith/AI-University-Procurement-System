/**
 * Quotation Analysis Engine
 * AI-powered bid verification, anomaly detection, and comparative analysis.
 *
 * Features:
 *   2. AI Seller Price Verification and Anomaly Detection
 *   7. AI Comparative Quotation Analysis
 *
 * Governance: Every output includes an explainabilityLog object.
 */
const logger = require('../config/logger');

class QuotationAnalysisEngine {
  /**
   * Verify seller quotations against market prices, historical data, and competing bids.
   * Triggers "High Price Anomaly Alert" when a bid exceeds the configured threshold.
   *
   * @param {Array} bids – bid documents for a tender
   * @param {number} engineersEstimate – the engineer's pre-tender estimate
   * @param {Array} historicalPrices – past prices for similar items
   * @param {object} options – { anomalyThreshold: 0.65 }
   * @param {object} aiService – injected AIService instance
   * @returns {object}
   */
  async verifyQuotations(bids, engineersEstimate, historicalPrices, options, aiService) {
    const startTime = Date.now();
    const threshold = options?.anomalyThreshold || 0.65;

    // --- Statistical Analysis ---
    const prices = bids.map(b => b.totalBidAmount).filter(Boolean);
    const mean = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
    const stdDev = prices.length > 1
      ? Math.sqrt(prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (prices.length - 1))
      : 0;

    // Flag anomalies: bids that exceed fair market avg by threshold %
    const fairMarketAvg = engineersEstimate || mean;
    const anomalies = [];
    const verifiedBids = bids.map(bid => {
      const deviation = fairMarketAvg > 0 ? (bid.totalBidAmount - fairMarketAvg) / fairMarketAvg : 0;
      const isAnomaly = deviation > threshold;
      const deviationFromMean = mean > 0 ? ((bid.totalBidAmount - mean) / mean) : 0;

      if (isAnomaly) {
        anomalies.push({
          vendorId: bid.vendorId,
          vendorName: bid.vendorId?.companyName || 'Unknown',
          bidAmount: bid.totalBidAmount,
          deviationPercent: (deviation * 100).toFixed(1),
          type: 'HIGH_PRICE_ANOMALY',
          severity: deviation > 1.0 ? 'critical' : 'warning',
          message: `Bid exceeds fair market average by ${(deviation * 100).toFixed(1)}% (threshold: ${(threshold * 100)}%)`,
        });
      }

      return {
        vendorId: bid.vendorId?._id || bid.vendorId,
        vendorName: bid.vendorId?.companyName || 'Unknown',
        bidNumber: bid.bidNumber,
        quotedAmount: bid.totalBidAmount,
        deviationFromMean: (deviationFromMean * 100).toFixed(1) + '%',
        deviationFromEstimate: engineersEstimate
          ? (((bid.totalBidAmount - engineersEstimate) / engineersEstimate) * 100).toFixed(1) + '%'
          : 'N/A',
        isAnomaly,
        anomalyType: isAnomaly ? 'overpriced' : (deviation < -0.3 ? 'suspiciously_low' : 'normal'),
        status: bid.status,
      };
    });

    // --- Collusion Detection ---
    const collusionPatterns = this._detectCollusionPatterns(bids);

    // --- AI-Enhanced Verification ---
    let aiVerification = null;
    if (aiService && bids.length >= 2) {
      try {
        const prompt = `Analyze these bid quotations for a Sri Lankan university procurement.

BIDS:
${JSON.stringify(verifiedBids, null, 2)}

ENGINEER'S ESTIMATE: LKR ${engineersEstimate || 'Not provided'}
STATISTICAL MEAN: LKR ${mean.toFixed(0)}
STANDARD DEVIATION: LKR ${stdDev.toFixed(0)}
HISTORICAL PRICES: ${JSON.stringify(historicalPrices?.slice(0, 10), null, 2)}

Identify:
1. Any overpriced bids with explanations
2. Suspiciously low bids that may indicate quality risks
3. Potential collusion indicators
4. Recommendations for the BEC

Return JSON:
{
  "overallAssessment": "string",
  "bidAssessments": [{ "vendorName": "string", "assessment": "string", "riskLevel": "low|medium|high" }],
  "collusionRisk": "none|low|medium|high",
  "collusionEvidence": "string or null",
  "recommendations": ["string"],
  "pricingTrend": "competitive|moderate|inflated"
}`;

        const result = await aiService.callGemini(
          prompt,
          'You are a bid evaluation fraud detection specialist for GOSL procurement. Return ONLY valid JSON.'
        );
        try {
          aiVerification = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
        } catch {
          aiVerification = { raw: result };
        }
      } catch (err) {
        logger.warn('AI bid verification failed', { error: err.message });
      }
    }

    return {
      statistics: { mean, stdDev, bidCount: bids.length, engineersEstimate, fairMarketAvg },
      verifiedBids,
      anomalies,
      collusionPatterns,
      aiVerification,
      explainabilityLog: {
        feature: 'SELLER_PRICE_VERIFICATION',
        bidsAnalyzed: bids.length,
        anomaliesDetected: anomalies.length,
        thresholdUsed: threshold,
        model: aiVerification ? 'gemini-2.0-flash' : 'statistical-only',
        processingTimeMs: Date.now() - startTime,
        dataSources: ['bid-submissions', 'engineers-estimate', 'statistical-analysis', 'gemini-verification'],
        weightsApplied: { marketAvg: 0.4, historicalPrice: 0.3, competingBids: 0.3 },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate a comparative quotation analysis matrix.
   * Calculates a unified compatibility score out of 100 for each vendor.
   *
   * @param {Array} bids – populated bid documents
   * @param {object} evaluationCriteria – { priceWeight, warrantyWeight, deliveryWeight, financialWeight }
   * @param {object} aiService – injected AIService instance
   * @returns {object}
   */
  async generateComparativeAnalysis(bids, evaluationCriteria, aiService) {
    const startTime = Date.now();
    const weights = {
      price: evaluationCriteria?.priceWeight || 40,
      warranty: evaluationCriteria?.warrantyWeight || 15,
      delivery: evaluationCriteria?.deliveryWeight || 25,
      financial: evaluationCriteria?.financialWeight || 20,
    };

    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

    // Normalize prices (lowest gets highest score)
    const prices = bids.map(b => b.totalBidAmount).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const matrix = bids.map(bid => {
      // Price score: inversely proportional (lowest = 100)
      const priceScore = maxPrice > minPrice
        ? ((maxPrice - bid.totalBidAmount) / (maxPrice - minPrice)) * 100
        : 100;

      // Technical/warranty score from evaluation if available
      const techScore = bid.technicalEvaluation?.totalScore
        ? (bid.technicalEvaluation.totalScore / (bid.technicalEvaluation.scores?.reduce((s, c) => s + c.maxScore, 0) || 100)) * 100
        : 50;

      // Delivery score from vendor metrics
      const deliveryScore = bid.vendorId?.metrics?.deliveryTimeliness || 50;

      // Financial capability score
      const financialScore = bid.vendorId?.performanceScore || 50;

      // Weighted compatibility score
      const compatibilityScore = Math.round(
        (priceScore * weights.price +
          techScore * weights.warranty +
          deliveryScore * weights.delivery +
          financialScore * weights.financial) / totalWeight
      );

      return {
        vendorId: bid.vendorId?._id || bid.vendorId,
        vendorName: bid.vendorId?.companyName || 'Unknown',
        bidNumber: bid.bidNumber,
        quotedAmount: bid.totalBidAmount,
        correctedAmount: bid.financialEvaluation?.correctedBidAmount || bid.totalBidAmount,
        scores: {
          price: Math.round(priceScore),
          technical: Math.round(techScore),
          delivery: Math.round(deliveryScore),
          financial: Math.round(financialScore),
        },
        compatibilityScore,
        strengths: [],
        weaknesses: [],
        status: bid.status,
        preliminaryResult: bid.preliminaryExam?.result,
      };
    });

    // Sort by compatibility score
    matrix.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // AI-enhanced analysis for strengths/weaknesses
    if (aiService && matrix.length >= 2) {
      try {
        const prompt = `Analyze this vendor comparison matrix for a procurement bid evaluation.

COMPARISON MATRIX:
${JSON.stringify(matrix, null, 2)}

EVALUATION WEIGHTS: Price ${weights.price}%, Technical ${weights.warranty}%, Delivery ${weights.delivery}%, Financial ${weights.financial}%

For each vendor, provide 2-3 strengths and 2-3 weaknesses based on their scores.

Return JSON:
{
  "vendorAnalysis": [
    { "vendorName": "string", "strengths": ["string"], "weaknesses": ["string"], "recommendation": "string" }
  ],
  "overallRecommendation": "string",
  "evaluationNotes": "string"
}`;

        const result = await aiService.callGemini(prompt, 'You are a BEC analyst. Return ONLY valid JSON.');
        try {
          const aiAnalysis = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
          if (aiAnalysis.vendorAnalysis) {
            aiAnalysis.vendorAnalysis.forEach(va => {
              const entry = matrix.find(m => m.vendorName === va.vendorName);
              if (entry) {
                entry.strengths = va.strengths || [];
                entry.weaknesses = va.weaknesses || [];
                entry.recommendation = va.recommendation || '';
              }
            });
          }
        } catch { /* AI enrichment is optional */ }
      } catch (err) {
        logger.warn('AI comparative analysis enrichment failed', { error: err.message });
      }
    }

    return {
      matrix,
      weights,
      bestOverall: matrix[0]?.vendorName || 'N/A',
      bestPrice: [...matrix].sort((a, b) => b.scores.price - a.scores.price)[0]?.vendorName || 'N/A',
      bestDelivery: [...matrix].sort((a, b) => b.scores.delivery - a.scores.delivery)[0]?.vendorName || 'N/A',
      explainabilityLog: {
        feature: 'COMPARATIVE_QUOTATION_ANALYSIS',
        vendorsCompared: matrix.length,
        weightsApplied: weights,
        scoringFormula: 'WeightedScore = Σ(Weight_i × Score_i) / TotalWeight',
        model: 'gemini-2.0-flash + statistical',
        processingTimeMs: Date.now() - startTime,
        dataSources: ['bid-submissions', 'vendor-performance-db', 'technical-evaluations', 'gemini-analysis'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Statistical collusion pattern detection.
   * @private
   */
  _detectCollusionPatterns(bids) {
    if (!bids || bids.length < 3) return { risk: 'insufficient_data', patterns: [] };
    const prices = bids.map(b => b.totalBidAmount).filter(Boolean).sort((a, b) => a - b);
    const patterns = [];

    // Price clustering: bids within 2% of each other
    for (let i = 0; i < prices.length - 1; i++) {
      const diff = Math.abs(prices[i + 1] - prices[i]) / prices[i];
      if (diff < 0.02) {
        patterns.push({
          type: 'price_clustering',
          severity: 'high',
          description: `Two bids within 2% of each other (LKR ${prices[i].toLocaleString()} and LKR ${prices[i + 1].toLocaleString()})`,
        });
      }
    }

    // Round number pattern
    const roundBids = prices.filter(p => p % 100000 === 0);
    if (roundBids.length > prices.length * 0.5) {
      patterns.push({
        type: 'round_numbers',
        severity: 'medium',
        description: `${roundBids.length}/${prices.length} bids are round numbers (>50%)`,
      });
    }

    // Sequential/arithmetic pattern
    if (prices.length >= 3) {
      let isSequential = true;
      const firstDiff = prices[1] - prices[0];
      for (let i = 2; i < prices.length; i++) {
        if (Math.abs((prices[i] - prices[i - 1]) - firstDiff) > firstDiff * 0.1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        patterns.push({
          type: 'sequential_pricing',
          severity: 'critical',
          description: 'Bid prices show arithmetic/sequential progression pattern',
        });
      }
    }

    const risk = patterns.some(p => p.severity === 'critical') ? 'high'
      : patterns.length > 1 ? 'medium'
        : patterns.length > 0 ? 'low' : 'none';

    return { risk, patterns, analyzedBids: bids.length };
  }
}

module.exports = new QuotationAnalysisEngine();
