const logger = require('../config/logger');
const aiConfig = require('../config/ai.config');

class RiskAnalysisEngine {
  constructor() {
    this.riskWeights = {
      priceDeviation: 0.30,
      vendorHistory: 0.25,
      deliveryPatterns: 0.20,
      specRestrictiveness: 0.15,
      documentCompleteness: 0.10,
    };
  }

  /**
   * Calculate a dynamic Procurement Risk Score for a requisition.
   *
   * @param {object} procurement – procurement document
   * @param {Array} vendors – vendors associated with the procurement (if any bids)
   * @param {object} marketData – { marketAvgPrice, historicalAvgPrice }
   * @param {object} aiService – optional, for AI-enhanced analysis
   * @returns {object} { riskScore, riskLevel, factors[], collusionAnalysis, explainabilityLog }
   */
  async calculateRiskScore(procurement, vendors, marketData, aiService) {
    const startTime = Date.now();
    const factors = [];

    // === Factor 1: Price Deviation (30%) ===
    let priceRisk = 0;
    if (marketData?.marketAvgPrice && procurement.totalEstimatedCost) {
      const deviation = Math.abs(procurement.totalEstimatedCost - marketData.marketAvgPrice) / marketData.marketAvgPrice;
      priceRisk = deviation > 0.5 ? 100
        : deviation > 0.3 ? 75
          : deviation > 0.15 ? 50
            : deviation > 0.05 ? 25 : 10;
      factors.push({
        factor: 'Price Deviation',
        weight: '30%',
        score: priceRisk,
        detail: `Estimated cost deviates ${(deviation * 100).toFixed(1)}% from market average`,
        severity: priceRisk >= 75 ? 'high' : priceRisk >= 50 ? 'medium' : 'low',
      });
    } else {
      priceRisk = 50; // Unknown = medium risk
      factors.push({
        factor: 'Price Deviation',
        weight: '30%',
        score: priceRisk,
        detail: 'Insufficient market data for comparison',
        severity: 'medium',
      });
    }

    // === Factor 2: Vendor History (25%) ===
    let vendorRisk = 50;
    if (vendors && vendors.length > 0) {
      const avgContracts = vendors.reduce((s, v) => s + (v.metrics?.totalContracts || 0), 0) / vendors.length;
      const hasUnvetted = vendors.some(v => v.status === 'pending' || !v.verifiedAt);
      const hasNew = vendors.some(v => (v.metrics?.totalContracts || 0) === 0);

      vendorRisk = hasUnvetted ? 90
        : hasNew ? 70
          : avgContracts < 3 ? 60
            : avgContracts < 10 ? 30 : 10;

      factors.push({
        factor: 'Vendor History',
        weight: '25%',
        score: vendorRisk,
        detail: `${vendors.length} vendors, avg ${avgContracts.toFixed(0)} contracts, ${hasUnvetted ? 'has unvetted vendors' : hasNew ? 'includes new vendors' : 'all established'}`,
        severity: vendorRisk >= 70 ? 'high' : vendorRisk >= 40 ? 'medium' : 'low',
      });
    } else {
      factors.push({
        factor: 'Vendor History',
        weight: '25%',
        score: vendorRisk,
        detail: 'No vendor data available at this stage',
        severity: 'medium',
      });
    }

    // === Factor 3: Delivery Patterns (20%) ===
    let deliveryRisk = 50;
    if (vendors && vendors.length > 0) {
      const avgDelivery = vendors.reduce((s, v) => s + (v.metrics?.deliveryTimeliness || 50), 0) / vendors.length;
      const hasExpiredCerts = vendors.some(v => {
        const certs = v.kycDocuments || [];
        return certs.some(c => c.expiryDate && new Date(c.expiryDate) < new Date());
      });

      deliveryRisk = hasExpiredCerts ? 80
        : avgDelivery < 40 ? 70
          : avgDelivery < 60 ? 50
            : avgDelivery < 80 ? 30 : 10;

      factors.push({
        factor: 'Delivery & Certifications',
        weight: '20%',
        score: deliveryRisk,
        detail: `Avg delivery score: ${avgDelivery.toFixed(0)}%, ${hasExpiredCerts ? 'expired certifications detected' : 'certifications current'}`,
        severity: deliveryRisk >= 70 ? 'high' : deliveryRisk >= 40 ? 'medium' : 'low',
      });
    } else {
      factors.push({
        factor: 'Delivery & Certifications',
        weight: '20%',
        score: deliveryRisk,
        detail: 'No delivery data available',
        severity: 'medium',
      });
    }

    // === Factor 4: Specification Restrictiveness (15%) ===
    let specRisk = 30;
    const specText = (procurement.description || '') + ' ' +
      (procurement.items || []).map(i => i.specifications || '').join(' ');
    const brandPatterns = /\b(brand|specific|only|exclusive|particular|proprietary|OEM)\b/gi;
    const brandMatches = (specText.match(brandPatterns) || []).length;
    const isSingleSource = procurement.procurementMethod === 'Direct';

    specRisk = isSingleSource ? 90
      : brandMatches >= 3 ? 80
        : brandMatches >= 1 ? 50 : 15;

    factors.push({
      factor: 'Specification Restrictiveness',
      weight: '15%',
      score: specRisk,
      detail: `${brandMatches} brand-specific terms found, ${isSingleSource ? 'single-source procurement' : 'competitive method'}`,
      severity: specRisk >= 70 ? 'high' : specRisk >= 40 ? 'medium' : 'low',
    });

    // === Factor 5: Document Completeness (10%) ===
    let docRisk = 50;
    const hasAttachments = (procurement.attachments || []).length > 0;
    const hasJustification = !!procurement.justification;
    const hasBudgetCode = procurement.items?.every(i => !!i.budgetCode);
    const completeness = [hasAttachments, hasJustification, hasBudgetCode].filter(Boolean).length;

    docRisk = completeness === 3 ? 10
      : completeness === 2 ? 30
        : completeness === 1 ? 60 : 90;

    factors.push({
      factor: 'Document Completeness',
      weight: '10%',
      score: docRisk,
      detail: `Attachments: ${hasAttachments ? '✓' : '✗'}, Justification: ${hasJustification ? '✓' : '✗'}, Budget codes: ${hasBudgetCode ? '✓' : '✗'}`,
      severity: docRisk >= 60 ? 'high' : docRisk >= 30 ? 'medium' : 'low',
    });

    // === Calculate Weighted Risk Score ===
    const weightedRiskScore = Math.round(
      priceRisk * this.riskWeights.priceDeviation +
      vendorRisk * this.riskWeights.vendorHistory +
      deliveryRisk * this.riskWeights.deliveryPatterns +
      specRisk * this.riskWeights.specRestrictiveness +
      docRisk * this.riskWeights.documentCompleteness
    );

    const riskLevel = weightedRiskScore >= 70 ? 'High'
      : weightedRiskScore >= 40 ? 'Medium' : 'Low';

    // === AI-Enhanced Risk Analysis ===
    let aiRiskAnalysis = null;
    if (aiService) {
      try {
        const prompt = `Analyze this procurement risk assessment for a Sri Lankan university.

PROCUREMENT: ${procurement.title}
Category: ${procurement.category}
Estimated Cost: LKR ${procurement.totalEstimatedCost?.toLocaleString()}
Method: ${procurement.procurementMethod}

RISK SCORE: ${weightedRiskScore}/100 (${riskLevel})

FACTOR BREAKDOWN:
${factors.map(f => `- ${f.factor} (${f.weight}): ${f.score}/100 — ${f.detail}`).join('\n')}

Provide additional AI insights and specific mitigation recommendations.

Return JSON:
{
  "additionalRisks": ["string"],
  "mitigationStrategies": ["string"],
  "complianceWarnings": ["string"],
  "overallAssessment": "string"
}`;

        const result = await aiService.callGemini(prompt, 'You are a procurement risk analyst. Return ONLY valid JSON.');
        try {
          aiRiskAnalysis = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
        } catch { aiRiskAnalysis = { overallAssessment: result }; }
      } catch (err) {
        logger.warn('AI risk analysis failed', { error: err.message });
      }
    }

    return {
      riskScore: weightedRiskScore,
      riskLevel,
      factors,
      aiRiskAnalysis,
      explainabilityLog: {
        feature: 'PROCUREMENT_RISK_SCORING',
        procurementId: procurement._id?.toString(),
        calculatedScore: weightedRiskScore,
        riskLevel,
        model: aiRiskAnalysis ? `${aiConfig.gemini.model} + statistical` : 'statistical-only',
        processingTimeMs: Date.now() - startTime,
        weightsApplied: this.riskWeights,
        factorScores: factors.map(f => ({ factor: f.factor, score: f.score })),
        dataSources: ['procurement-document', 'vendor-profiles', 'market-data', 'gemini-analysis'],
        formula: 'WeightedRisk = Σ(FactorWeight_i × FactorRiskScore_i)',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Detect bid collusion patterns — enhanced version.
   *
   * @param {Array} bids – bid documents
   * @param {Array} vendorHistory – historical winning patterns
   * @returns {object}
   */
  detectBidCollusion(bids, vendorHistory) {
    if (!bids || bids.length < 3) return { collusionRisk: 'insufficient_data', patterns: [] };
    const prices = bids.map(b => b.totalBidAmount).filter(Boolean).sort((a, b) => a - b);
    const patterns = [];

    // Price clustering
    for (let i = 0; i < prices.length - 1; i++) {
      const diff = Math.abs(prices[i + 1] - prices[i]) / prices[i];
      if (diff < 0.02) {
        patterns.push({ type: 'price_clustering', severity: 'high', description: `Bids ${i + 1} and ${i + 2} are within 2% of each other` });
      }
    }

    // Round number pattern
    const roundBids = bids.filter(b => b.totalBidAmount % 100000 === 0);
    if (roundBids.length > bids.length * 0.5) {
      patterns.push({ type: 'round_numbers', severity: 'medium', description: 'More than 50% of bids are round numbers' });
    }

    // Sequential pricing
    if (prices.length >= 3) {
      let isSequential = true;
      for (let i = 1; i < prices.length; i++) {
        const increment = prices[i] - prices[i - 1];
        if (i > 1 && Math.abs(increment - (prices[i - 1] - prices[i - 2])) > increment * 0.1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        patterns.push({ type: 'sequential_pricing', severity: 'critical', description: 'Bid prices show arithmetic sequential pattern' });
      }
    }

    // Rotation pattern detection
    if (vendorHistory && vendorHistory.length > 5) {
      const winners = vendorHistory.map(h => h.winnerId?.toString()).filter(Boolean);
      const uniqueWinners = [...new Set(winners)];
      if (uniqueWinners.length <= 2 && vendorHistory.length > 5) {
        patterns.push({ type: 'rotation_pattern', severity: 'high', description: 'Same 1-2 vendors winning alternately across multiple tenders' });
      }
    }

    const collusionRisk = patterns.some(p => p.severity === 'critical') ? 'high'
      : patterns.length > 1 ? 'medium'
        : patterns.length > 0 ? 'low' : 'none';

    return { collusionRisk, patterns, analyzedBids: bids.length };
  }

  /**
   * Detect process anomalies (rapid approvals, threshold splitting).
   *
   * @param {object} procurement – procurement document
   * @returns {Array} anomalies
   */
  detectProcessAnomalies(procurement) {
    const anomalies = [];
    if (!procurement) return anomalies;

    // Rapid approval detection
    if (procurement.approvalChain) {
      procurement.approvalChain.forEach(stage => {
        if (stage.actionDate && procurement.submittedAt) {
          const hours = (new Date(stage.actionDate) - new Date(procurement.submittedAt)) / (1000 * 60 * 60);
          if (hours < 0.5) {
            anomalies.push({
              type: 'rapid_approval',
              severity: 'warning',
              description: `${stage.stage} approved in under 30 minutes`,
              detectedAt: new Date(),
            });
          }
        }
      });
    }

    // Split procurement detection (avoiding TCE thresholds)
    if (procurement.totalEstimatedCost) {
      const thresholds = [500000, 5000000, 50000000, 400000000];
      thresholds.forEach(t => {
        const pct = procurement.totalEstimatedCost / t;
        if (pct > 0.85 && pct < 1.0) {
          anomalies.push({
            type: 'threshold_proximity',
            severity: 'warning',
            description: `Amount is ${(pct * 100).toFixed(0)}% of LKR ${t.toLocaleString()} threshold — potential split procurement`,
            detectedAt: new Date(),
          });
        }
      });
    }

    return anomalies;
  }
}

module.exports = new RiskAnalysisEngine();
