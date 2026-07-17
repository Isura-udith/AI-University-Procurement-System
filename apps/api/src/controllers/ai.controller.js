
const aiService = require('../services/ai.service');
const explainabilityService = require('../services/ai.explainability.service');
const Procurement = require('../models/procurement.model');
const Tender = require('../models/tender.model');
const Bid = require('../models/bid.model');
const Vendor = require('../models/vendor.model');
const MarketAlert = require('../models/market.alert.model');
const aiConfig = require('../config/ai.config');
const { success, paginated } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Feature 1: AI Real-Time Market Price Recommendation
 * POST /ai/market-price
 */
const getMarketPrice = async (req, res, next) => {
  try {
    const { items, rawText } = req.body;

    // If raw text provided, parse it first (Feature 4: NLP)
    let parsedItems = items;
    let nlpResult = null;
    if (rawText && !items?.length) {
      nlpResult = await aiService.parseRequisitionNLP(rawText);
      parsedItems = nlpResult.items || [];
    }

    // Get historical prices for matching items
    const categories = [...new Set((parsedItems || []).map(i => i.category).filter(Boolean))];
    const historicalPrices = await Procurement.find({
      tenantId: req.tenantId,
      category: { $in: categories.length > 0 ? categories : ['Goods'] },
      status: 'completed',
    }).select('items totalEstimatedCost referenceNumber createdAt category').sort('-createdAt').limit(50).lean();

    const result = await aiService.getMarketPriceRecommendation(parsedItems, historicalPrices);

    // Record explainability log
    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
    });

    return success(res, {
      nlpResult,
      priceRecommendation: result,
      humanInTheLoop: true,
      governance: 'AI recommendation only. Prices must be verified by Procurement Division.',
    });
  } catch (err) { next(err); }
};

/**
 * Feature 2: AI Seller Price Verification and Anomaly Detection
 * POST /ai/verify-quotations/:tenderId
 */
const verifyQuotations = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.tenderId, tenantId: req.tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });

    const bids = await Bid.find({ tenderId: tender._id, tenantId: req.tenantId })
      .populate('vendorId', 'companyName performanceScore metrics');

    // Historical prices for similar items
    const procurement = await Procurement.findById(tender.procurementId).lean();
    const historicalPrices = await Procurement.find({
      tenantId: req.tenantId,
      category: procurement?.category,
      status: 'completed',
    }).select('totalEstimatedCost referenceNumber createdAt').sort('-createdAt').limit(20).lean();

    const result = await aiService.verifyQuotations(
      bids,
      tender.engineersEstimate,
      historicalPrices,
      { anomalyThreshold: aiConfig.analysis.priceAnomalyThreshold }
    );

    // Record explainability log
    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
      tenderId: tender._id,
    });

    return success(res, {
      tenderId: tender._id,
      tenderNumber: tender.tenderNumber,
      ...result,
      humanInTheLoop: true,
      governance: 'Price anomalies flagged for BEC review. No automatic bid rejection.',
    });
  } catch (err) { next(err); }
};

/**
 * Feature 3: AI Smart Decision Support (Trade-off Analysis)
 * POST /ai/smart-recommendations/:tenderId
 */
const getSmartRecommendations = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.tenderId, tenantId: req.tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });

    const bids = await Bid.find({ tenderId: tender._id, tenantId: req.tenantId })
      .populate('vendorId');

    // Get vendor assessments
    const vendorAssessments = [];
    for (const bid of bids) {
      if (bid.vendorId) {
        const { score, tier, breakdown } = require('../ai/vendor.ranking').calculateVendorScore(bid.vendorId);
        vendorAssessments.push({
          vendorId: bid.vendorId._id,
          performanceScore: score,
          tier,
          scoreBreakdown: breakdown,
        });
      }
    }

    const result = await aiService.generateSmartRecommendations(bids, tender, vendorAssessments);

    // Save recommendations to tender
    tender.aiRecommendations = {
      bestPrice: result.bestPrice,
      bestValue: result.bestValue,
      fastestDelivery: result.fastestDelivery,
      lowestRisk: result.lowestRisk,
      aiSummary: result.aiSummary,
      generatedAt: new Date(),
    };
    await tender.save();

    // Record explainability log
    const logDoc = await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
      tenderId: tender._id,
    });
    if (logDoc) {
      tender.explainabilityLogIds = tender.explainabilityLogIds || [];
      tender.explainabilityLogIds.push(logDoc._id);
      await tender.save();
    }

    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * Feature 4: AI Product and Document Understanding (NLP)
 * POST /ai/parse-requisition
 */
const parseRequisition = async (req, res, next) => {
  try {
    const { rawText } = req.body;
    if (!rawText) throw Object.assign(new Error('rawText is required'), { statusCode: 400 });

    const result = await aiService.parseRequisitionNLP(rawText);

    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
    });

    return success(res, {
      ...result,
      humanInTheLoop: true,
      governance: 'Parsed data should be reviewed and confirmed by the requisitioner before submission.',
    });
  } catch (err) { next(err); }
};

/**
 * Feature 5: AI Dynamic Market Monitoring
 * GET /ai/market-alerts
 */
const getMarketAlerts = async (req, res, next) => {
  try {
    // Get active procurement categories
    const activeCategories = await Procurement.distinct('category', {
      tenantId: req.tenantId,
      status: { $nin: ['completed', 'cancelled', 'rejected'] },
    });

    // Check for recent alerts first
    const recentAlerts = await MarketAlert.find({
      tenantId: req.tenantId,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort('-createdAt').limit(20);

    // If no recent alerts, generate new ones
    let alerts = recentAlerts;
    let marketSummary = null;

    if (recentAlerts.length === 0 || req.query.refresh === 'true') {
      const result = await aiService.generateMarketAlerts(activeCategories);

      // Save alerts to DB
      if (result.alerts && result.alerts.length > 0) {
        const savedAlerts = await MarketAlert.insertMany(
          result.alerts.map(a => ({
            tenantId: req.tenantId,
            alertType: a.alertType || 'commodity_surge',
            severity: a.severity || 'medium',
            affectedCategory: a.affectedCategory,
            title: a.title,
            description: a.description,
            predictedImpact: a.predictedImpact,
            recommendation: a.recommendation,
            timeframe: a.timeframe,
          }))
        );
        alerts = savedAlerts;
      }
      marketSummary = result.marketSummary;

      await explainabilityService.recordLog(result.explainabilityLog, {
        userId: req.user._id,
        tenantId: req.tenantId,
      });
    }

    return success(res, {
      alerts,
      marketSummary,
      activeCategories,
      humanInTheLoop: true,
    });
  } catch (err) { next(err); }
};

/**
 * Feature 6: AI Procurement Risk Scoring
 * POST /ai/risk-score/:procurementId
 */
const getRiskScore = async (req, res, next) => {
  try {
    const procurement = await Procurement.findOne({ _id: req.params.procurementId, tenantId: req.tenantId });
    if (!procurement) throw Object.assign(new Error('Procurement not found'), { statusCode: 404 });

    // Get associated vendors (from bids if available)
    let vendors = [];
    if (procurement.tenderId) {
      const bids = await Bid.find({ tenderId: procurement.tenderId }).populate('vendorId');
      vendors = bids.map(b => b.vendorId).filter(Boolean);
    }

    // Get market data
    const historicalPrices = await Procurement.find({
      tenantId: req.tenantId,
      category: procurement.category,
      status: 'completed',
    }).select('totalEstimatedCost').lean();

    const marketAvgPrice = historicalPrices.length > 0
      ? historicalPrices.reduce((s, p) => s + p.totalEstimatedCost, 0) / historicalPrices.length
      : null;

    const result = await aiService.calculateRiskScore(
      procurement, vendors, { marketAvgPrice }
    );

    // Save risk score to procurement
    procurement.aiAnalysis = procurement.aiAnalysis || {};
    procurement.aiAnalysis.riskScore = result.riskScore;
    procurement.aiAnalysis.riskLevel = result.riskLevel;
    procurement.aiAnalysis.riskAssessment = {
      factors: result.factors,
      aiRiskAnalysis: result.aiRiskAnalysis,
      assessedAt: new Date(),
    };
    await procurement.save();

    // Record explainability log
    const logDoc = await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
      procurementId: procurement._id,
    });
    if (logDoc) {
      procurement.aiAnalysis.explainabilityLogIds = procurement.aiAnalysis.explainabilityLogIds || [];
      procurement.aiAnalysis.explainabilityLogIds.push(logDoc._id);
      await procurement.save();
    }

    return success(res, {
      procurementId: procurement._id,
      referenceNumber: procurement.referenceNumber,
      ...result,
      humanInTheLoop: true,
      governance: 'Risk score is advisory. Routing and approval decisions remain with authorized officers.',
    });
  } catch (err) { next(err); }
};

/**
 * Feature 7: AI Comparative Quotation Analysis
 * POST /ai/comparative-analysis/:tenderId
 */
const getComparativeAnalysis = async (req, res, next) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.tenderId, tenantId: req.tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });

    const bids = await Bid.find({ tenderId: tender._id, tenantId: req.tenantId })
      .populate('vendorId');

    const result = await aiService.generateComparativeAnalysis(bids, req.body.weights || null);

    // Save matrix to tender
    tender.comparativeMatrix = result.matrix.map(m => ({
      vendorId: m.vendorId,
      vendorName: m.vendorName,
      compatibilityScore: m.compatibilityScore,
      scores: m.scores,
    }));
    await tender.save();

    // Record log
    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
      tenderId: tender._id,
    });

    return success(res, {
      tenderId: tender._id,
      tenderNumber: tender.tenderNumber,
      ...result,
      humanInTheLoop: true,
    });
  } catch (err) { next(err); }
};

/**
 * Feature 8: AI Historical Procurement Analysis
 * POST /ai/historical-match/:procurementId
 */
const getHistoricalMatch = async (req, res, next) => {
  try {
    const procurement = await Procurement.findOne({ _id: req.params.procurementId, tenantId: req.tenantId });
    if (!procurement) throw Object.assign(new Error('Procurement not found'), { statusCode: 404 });

    // Find past similar procurements
    const pastTransactions = await Procurement.find({
      tenantId: req.tenantId,
      category: procurement.category,
      status: 'completed',
      _id: { $ne: procurement._id },
    })
      .select('title items totalEstimatedCost referenceNumber createdAt department category')
      .sort('-createdAt')
      .limit(30)
      .lean();

    const result = await aiService.matchHistoricalProcurement(procurement, pastTransactions);

    // Save to procurement
    procurement.aiAnalysis = procurement.aiAnalysis || {};
    procurement.aiAnalysis.historicalMatch = {
      matches: result.matches || [],
      priceDeviation: result.priceDeviation,
      alerts: result.alerts || [],
      matchedAt: new Date(),
    };
    await procurement.save();

    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
      procurementId: procurement._id,
    });

    return success(res, {
      procurementId: procurement._id,
      referenceNumber: procurement.referenceNumber,
      ...result,
      humanInTheLoop: true,
    });
  } catch (err) { next(err); }
};

/**
 * Feature 9: AI Demand Forecasting
 * GET /ai/demand-forecast
 */
const getDemandForecast = async (req, res, next) => {
  try {
    const { faculty, category } = req.query;

    // Gather historical data
    const filters = { tenantId: req.tenantId };
    if (faculty) filters.faculty = faculty;
    if (category) filters.category = category;

    const historicalData = await Procurement.find(filters)
      .select('title category faculty department totalEstimatedCost items createdAt status')
      .sort('-createdAt')
      .limit(200)
      .lean();

    const result = await aiService.forecastDemand(faculty || 'all', category || 'all', historicalData);

    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
    });

    return success(res, {
      ...result,
      humanInTheLoop: true,
      governance: 'Demand forecasts are AI estimates. Budget allocation decisions remain with Finance Division.',
    });
  } catch (err) { next(err); }
};

/**
 * Governance: AI Explainability Logs
 * GET /ai/explainability-logs
 */
const getExplainabilityLogs = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await explainabilityService.getLogs(req.query, req.tenantId);
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};

/**
 * GET /ai/explainability-logs/stats
 */
const getExplainabilityStats = async (req, res, next) => {
  try {
    const stats = await explainabilityService.getStats(req.tenantId);
    return success(res, stats);
  } catch (err) { next(err); }
};

/**
 * GET /ai/explainability-logs/:id
 */
const getExplainabilityLog = async (req, res, next) => {
  try {
    const log = await explainabilityService.getLogById(req.params.id, req.tenantId);
    return success(res, log);
  } catch (err) { next(err); }
};

/**
 * POST /ai/acknowledge-alert/:alertId
 */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await MarketAlert.findOne({ _id: req.params.alertId, tenantId: req.tenantId });
    if (!alert) throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
    alert.acknowledged = true;
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    alert.actionTaken = req.body.actionTaken || '';
    await alert.save();
    return success(res, alert, 'Alert acknowledged');
  } catch (err) { next(err); }
};

/**
 * GET /ai/status
 * Returns Gemini API connectivity status so the frontend can show a health badge.
 */
const getAIStatus = async (req, res, next) => {
  try {
    const configured = aiService.isConfigured();
    if (!configured) {
      return success(res, {
        status: 'unconfigured',
        model: aiConfig.gemini.model,
        message: 'GEMINI_API_KEY is missing or invalid in environment configuration.',
      });
    }

    // Minimal probe call — short prompt, low tokens
    try {
      await aiService.callGemini('Reply with the single word: ok', '', { maxTokens: 5, retries: 1 });
      return success(res, {
        status: 'connected',
        model: aiConfig.gemini.model,
        message: 'Gemini API is reachable and responding.',
      });
    } catch (probeErr) {
      const raw = probeErr.message || '';
      const is429 = raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED');
      return success(res, {
        status: is429 ? 'quota_exceeded' : 'error',
        model: aiConfig.gemini.model,
        message: is429
          ? 'API key is valid but the free-tier quota is exhausted. Requests will fail until the quota resets.'
          : `Gemini API error: ${raw.substring(0, 300)}`,
        detail: raw.substring(0, 600),
      });
    }
  } catch (err) { next(err); }
};

/**
 * Interactive AI Chat via Flowise
 * POST /ai/chat
 */
const askFlowiseChat = async (req, res, next) => {
  try {
    const { question, sessionId } = req.body;
    if (!question) {
      throw Object.assign(new Error('Question is required'), { statusCode: 400 });
    }

    const result = await aiService.askFlowise(question, sessionId);

    // Record explainability log
    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
    });

    return success(res, {
      text: result.text,
      chatId: result.chatId,
      sessionId: result.sessionId,
    });
  } catch (err) { next(err); }
};

/**
 * Internal DB Query API for Flowise Custom Tool
 * POST /ai/internal-query
 */
const runInternalQuery = async (req, res, next) => {
  try {
    const internalKey = req.headers['x-internal-key'];
    const env = require('../config/env');
    
    if (!internalKey || internalKey !== env.INTERNAL_API_KEY) {
      return res.status(401).json({ success: false, message: 'Unauthorized internal access key' });
    }

    const { model, queryText } = req.body;
    if (!model) {
      return res.status(400).json({ success: false, message: 'Model is required' });
    }

    let results = [];
    const searchRegex = queryText ? new RegExp(queryText, 'i') : null;

    if (model === 'procurement') {
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { referenceNumber: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await Procurement.find(filter)
        .select('referenceNumber title category status estimatedTotalPrice items createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } else if (model === 'tender') {
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { tenderNumber: searchRegex },
          { title: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await Tender.find(filter)
        .select('tenderNumber title category status closingDate engineersEstimate createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } else if (model === 'vendor') {
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { companyName: searchRegex },
          { registrationNumber: searchRegex },
          { ratingTier: searchRegex },
        ];
      }
      results = await Vendor.find(filter)
        .select('companyName registrationNumber performanceScore ratingTier isBlacklisted category')
        .sort({ performanceScore: -1 })
        .limit(10)
        .lean();
    } else {
      return res.status(400).json({ success: false, message: `Unsupported model: ${model}` });
    }

    return success(res, results);
  } catch (err) { next(err); }
};

module.exports = {
  getMarketPrice,
  verifyQuotations,
  getSmartRecommendations,
  parseRequisition,
  getMarketAlerts,
  getRiskScore,
  getComparativeAnalysis,
  getHistoricalMatch,
  getDemandForecast,
  getExplainabilityLogs,
  getExplainabilityStats,
  getExplainabilityLog,
  acknowledgeAlert,
  getAIStatus,
  askFlowiseChat,
  runInternalQuery,
};
