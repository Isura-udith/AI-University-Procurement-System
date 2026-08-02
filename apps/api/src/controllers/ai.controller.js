
const aiService = require('../services/ai.service');
const explainabilityService = require('../services/ai.explainability.service');
const tenderService = require('../services/tender.service');
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
 * Returns combined Gemini + Flowise health status.
 */
const getAIStatus = async (req, res, next) => {
  try {
    // Gemini status check
    const configured = aiService.isConfigured();
    let geminiStatus;

    if (!configured) {
      geminiStatus = {
        status: 'unconfigured',
        model: aiConfig.gemini.model,
        message: 'GEMINI_API_KEY is missing or invalid in environment configuration.',
      };
    } else {
      try {
        await aiService.callGemini('Reply with the single word: ok', '', { maxTokens: 5, retries: 1 });
        geminiStatus = {
          status: 'connected',
          model: aiConfig.gemini.model,
          message: 'Gemini API is reachable and responding.',
        };
      } catch (probeErr) {
        const raw = probeErr.message || '';
        const is429 = raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED');
        geminiStatus = {
          status: is429 ? 'quota_exceeded' : 'error',
          model: aiConfig.gemini.model,
          message: is429
            ? 'API key is valid but the free-tier quota is exhausted. Requests will fail until the quota resets.'
            : `Gemini API error: ${raw.substring(0, 300)}`,
          detail: raw.substring(0, 600),
        };
      }
    }

    // Flowise status check (non-blocking)
    let flowiseStatus;
    try {
      flowiseStatus = await aiService.checkFlowiseHealth();
    } catch {
      flowiseStatus = {
        status: 'down',
        server: false,
        chatflow: false,
        documentStore: false,
        message: 'Failed to check Flowise health.',
      };
    }

    // Determine overall health
    const geminiOk = geminiStatus.status === 'connected';
    const flowiseOk = flowiseStatus.status === 'healthy';
    let overall = 'down';
    if (geminiOk && flowiseOk) overall = 'healthy';
    else if (geminiOk || flowiseOk) overall = 'degraded';

    return success(res, {
      overall,
      gemini: geminiStatus,
      flowise: flowiseStatus,
      // Legacy compatibility — keep flat fields for existing frontend
      status: geminiStatus.status,
      model: geminiStatus.model,
      message: geminiStatus.message,
      detail: geminiStatus.detail,
    });
  } catch (err) { next(err); }
};

/**
 * Interactive AI Chat via Flowise (Enhanced)
 * POST /ai/chat
 */
const askFlowiseChat = async (req, res, next) => {
  try {
    const { question, sessionId } = req.body;
    if (!question) {
      throw Object.assign(new Error('Question is required'), { statusCode: 400 });
    }

    // Load conversation history from session for context memory
    let conversationHistory = [];
    try {
      const ChatSession = require('../models/chat.session.model');
      const session = await ChatSession.findOne({ sessionId, userId: req.user._id });
      if (session && session.messages && session.messages.length > 0) {
        // Get last 6 messages for context
        conversationHistory = session.messages.slice(-6).map(m => ({
          role: m.role,
          content: m.content,
        }));
      }
    } catch (historyErr) {
      logger.warn('Could not load conversation history', { error: historyErr.message });
    }

    const result = await aiService.askFlowise(question, sessionId, conversationHistory);

    // Save chat message to session
    try {
      await aiService.saveChatMessage(
        sessionId,
        req.user._id,
        req.tenantId,
        question,
        result
      );
    } catch (saveErr) {
      logger.warn('Failed to persist chat message', { error: saveErr.message });
    }

    // Record explainability log
    await explainabilityService.recordLog(result.explainabilityLog, {
      userId: req.user._id,
      tenantId: req.tenantId,
    });

    return success(res, {
      text: result.text,
      chatId: result.chatId,
      sessionId: result.sessionId,
      sourceDocuments: result.sourceDocuments,
      usedTools: result.usedTools,
      followUpSuggestions: result.followUpSuggestions,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (err) { next(err); }
};

/**
 * GET /ai/chat/sessions — List user's chat sessions
 */
const getChatSessions = async (req, res, next) => {
  try {
    const result = await aiService.getChatSessions(req.user._id, req.tenantId, {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });
    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * GET /ai/chat/sessions/:sessionId — Get chat history for a session
 */
const getChatHistory = async (req, res, next) => {
  try {
    const history = await aiService.getChatHistory(req.params.sessionId, req.user._id);
    if (!history) {
      return success(res, { messages: [], sessionId: req.params.sessionId, title: 'New Conversation' });
    }
    return success(res, history);
  } catch (err) { next(err); }
};

/**
 * DELETE /ai/chat/sessions/:sessionId — Archive a chat session
 */
const deleteChatSession = async (req, res, next) => {
  try {
    const result = await aiService.deleteChatSession(req.params.sessionId, req.user._id);
    return success(res, result, 'Session archived');
  } catch (err) { next(err); }
};

/**
 * PATCH /ai/chat/sessions/:sessionId — Rename a chat session
 */
const renameChatSession = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) throw Object.assign(new Error('Title is required'), { statusCode: 400 });
    const result = await aiService.renameChatSession(req.params.sessionId, req.user._id, title);
    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * POST /ai/chat/sessions/:sessionId/pin — Toggle pin on a session
 */
const togglePinSession = async (req, res, next) => {
  try {
    const result = await aiService.togglePinSession(req.params.sessionId, req.user._id);
    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * POST /ai/chat/sessions/:sessionId/rate — Rate a chat message
 */
const rateChatMessage = async (req, res, next) => {
  try {
    const { messageIndex, rating, feedback } = req.body;
    if (rating === undefined || messageIndex === undefined) {
      throw Object.assign(new Error('messageIndex and rating are required'), { statusCode: 400 });
    }
    const result = await aiService.rateChatMessage(
      req.params.sessionId, req.user._id, messageIndex, rating, feedback
    );
    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * Internal DB Query API for Flowise Custom Tool (Expanded)
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
    const rawQuery = (queryText || '').trim();
    const isSearchActive = /active|open|current|ongoing/i.test(rawQuery);
    const searchRegex = rawQuery ? new RegExp(rawQuery, 'i') : null;

    if (model === 'procurement') {
      const filter = { tenantId: 'uwu-main' };
      if (isSearchActive) {
        filter.status = { $nin: ['completed', 'cancelled', 'rejected'] };
      } else if (searchRegex) {
        filter.$or = [
          { referenceNumber: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { status: searchRegex },
          { category: searchRegex },
        ];
      }
      results = await Procurement.find(filter)
        .select('referenceNumber title category status estimatedTotalPrice items createdAt department')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Procurement.find({ tenantId: 'uwu-main' })
          .select('referenceNumber title category status estimatedTotalPrice items createdAt department')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'tender') {
      const filter = { tenantId: 'uwu-main' };
      if (isSearchActive) {
        filter.status = { $nin: ['closed', 'cancelled', 'awarded'] };
      } else if (searchRegex) {
        filter.$or = [
          { tenderNumber: searchRegex },
          { title: searchRegex },
          { status: searchRegex },
          { category: searchRegex },
        ];
      }
      results = await Tender.find(filter)
        .select('tenderNumber title category status closingDate engineersEstimate createdAt department')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Tender.find({ tenantId: 'uwu-main' })
          .select('tenderNumber title category status closingDate engineersEstimate createdAt department')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'vendor') {
      const filter = { tenantId: 'uwu-main' };
      if (isSearchActive) {
        filter.isBlacklisted = false;
      } else if (searchRegex) {
        filter.$or = [
          { companyName: searchRegex },
          { registrationNumber: searchRegex },
          { ratingTier: searchRegex },
          { category: searchRegex },
        ];
      }
      results = await Vendor.find(filter)
        .select('companyName registrationNumber performanceScore ratingTier isBlacklisted category contactPerson email phone')
        .sort({ performanceScore: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Vendor.find({ tenantId: 'uwu-main' })
          .select('companyName registrationNumber performanceScore ratingTier isBlacklisted category')
          .sort({ performanceScore: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'bid') {
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { bidNumber: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await Bid.find(filter)
        .select('bidNumber tenderId vendorId totalBidAmount status submittedAt createdAt')
        .populate('vendorId', 'companyName')
        .populate('tenderId', 'tenderNumber title')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Bid.find({ tenantId: 'uwu-main' })
          .select('bidNumber tenderId vendorId totalBidAmount status submittedAt createdAt')
          .populate('vendorId', 'companyName')
          .populate('tenderId', 'tenderNumber title')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'contract') {
      const Contract = require('../models/contract.model');
      const filter = { tenantId: 'uwu-main' };
      if (isSearchActive) {
        filter.status = { $nin: ['completed', 'terminated', 'expired'] };
      } else if (searchRegex) {
        filter.$or = [
          { contractNumber: searchRegex },
          { title: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await Contract.find(filter)
        .select('contractNumber title contractValue status contractType startDate endDate vendorId')
        .populate('vendorId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Contract.find({ tenantId: 'uwu-main' })
          .select('contractNumber title contractValue status contractType startDate endDate vendorId')
          .populate('vendorId', 'companyName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'budget') {
      const BudgetAllocation = require('../models/budget.allocation.model');
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { referenceNumber: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await BudgetAllocation.find(filter)
        .select('referenceNumber budgetYear totalUniversityBudget procurementBudget status departmentAllocations')
        .sort({ budgetYear: -1 })
        .limit(5)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await BudgetAllocation.find({ tenantId: 'uwu-main' })
          .select('referenceNumber budgetYear totalUniversityBudget procurementBudget status departmentAllocations')
          .sort({ budgetYear: -1 })
          .limit(5)
          .lean();
      }
    } else if (model === 'inventory') {
      const InventoryItem = require('../models/inventory.model');
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { itemCode: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await InventoryItem.find(filter)
        .select('itemCode description category quantityOnHand minimumStockLevel unitCost status location')
        .sort({ quantityOnHand: 1 })
        .limit(15)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await InventoryItem.find({ tenantId: 'uwu-main' })
          .select('itemCode description category quantityOnHand minimumStockLevel unitCost status location')
          .sort({ quantityOnHand: 1 })
          .limit(15)
          .lean();
      }
    } else if (model === 'payment') {
      const Payment = require('../models/payment.model');
      const filter = { tenantId: 'uwu-main' };
      if (searchRegex) {
        filter.$or = [
          { paymentNumber: searchRegex },
          { status: searchRegex },
        ];
      }
      results = await Payment.find(filter)
        .select('paymentNumber amount netAmount status paymentType threeWayMatchStatus vendorId contractId createdAt')
        .populate('vendorId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (results.length === 0 && searchRegex) {
        results = await Payment.find({ tenantId: 'uwu-main' })
          .select('paymentNumber amount netAmount status paymentType threeWayMatchStatus vendorId contractId createdAt')
          .populate('vendorId', 'companyName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      }
    } else if (model === 'stats') {
      // Aggregate dashboard statistics
      const [procCount, tenderCount, vendorCount, bidCount] = await Promise.all([
        Procurement.countDocuments({ tenantId: 'uwu-main' }),
        Tender.countDocuments({ tenantId: 'uwu-main' }),
        Vendor.countDocuments({ tenantId: 'uwu-main' }),
        Bid.countDocuments({ tenantId: 'uwu-main' }),
      ]);

      const activeProcurements = await Procurement.countDocuments({
        tenantId: 'uwu-main',
        status: { $nin: ['completed', 'cancelled', 'rejected'] },
      });

      const activeTenders = await Tender.countDocuments({
        tenantId: 'uwu-main',
        status: { $nin: ['closed', 'cancelled', 'awarded'] },
      });

      const statusBreakdown = await Procurement.aggregate([
        { $match: { tenantId: 'uwu-main' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      results = [{
        totalProcurements: procCount,
        activeProcurements,
        totalTenders: tenderCount,
        activeTenders,
        totalVendors: vendorCount,
        totalBids: bidCount,
        procurementStatusBreakdown: statusBreakdown,
      }];
    } else if (model === 'gosl_compliance') {
      const { estimatedValue, procurementMethod } = req.body;
      const val = estimatedValue ? Number(estimatedValue) : null;
      
      const guidelines = {
        shoppingThresholdLKR: 10000000, // 10M LKR
        ncbThresholdLKR: 500000000,    // 500M LKR
        pfmActReference: 'Public Financial Management (PFM) Act No. 44 of 2024',
        tecRequirements: 'Minimum 3 members: 1 Chairman, 1 Technical Specialist, 1 Finance/Bursar Representative',
        threeWayMatchRules: 'Matching of (1) Approved Purchase Order, (2) Signed Goods Received Note (GRN), and (3) Original Supplier Invoice is mandatory prior to payment release.',
      };

      let evaluatedMethod = procurementMethod || 'Shopping';
      let complianceStatus = 'Compliant';
      const warnings = [];

      if (val) {
        if (val <= 10000000) {
          evaluatedMethod = 'Shopping Method (Departmental / Minor Procurement)';
        } else if (val <= 500000000) {
          evaluatedMethod = 'National Competitive Bidding (NCB)';
          if (/shopping/i.test(procurementMethod || '')) {
            complianceStatus = 'Non-Compliant Threshold Breach';
            warnings.push(`Estimated cost LKR ${val.toLocaleString()} exceeds Shopping method limit of LKR 10,000,000. Must use NCB.`);
          }
        } else {
          evaluatedMethod = 'International Competitive Bidding (ICB)';
        }
      }

      results = [{
        complianceStatus,
        evaluatedMethod,
        estimatedValueLKR: val,
        guidelines,
        warnings,
        recommendedAction: warnings.length > 0
          ? 'Re-classify procurement method in accordance with GOSL Guidelines Chapter 3.'
          : 'Proceed with Technical Evaluation Committee (TEC) formation and tender documentation.',
        legalFramework: 'Sri Lanka Government Procurement Guidelines (2006/2024 updates) & PFM Act No. 44 of 2024'
      }];
    } else if (model === 'risk_analysis') {
      const { procurementId, vendorName } = req.body;
      const filter = { tenantId: 'uwu-main' };
      if (procurementId) {
        filter.$or = [{ _id: procurementId }, { referenceNumber: new RegExp(procurementId, 'i') }];
      }

      const sampleProcurements = await Procurement.find(filter)
        .select('referenceNumber title estimatedTotalPrice category status department createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const riskEvaluations = sampleProcurements.map(p => {
        const est = p.estimatedTotalPrice || 0;
        let riskScore = 15;
        const flags = [];

        if (est > 10000000) {
          riskScore += 25;
          flags.push('High Financial Threshold (> LKR 10M)');
        }
        if (p.status === 'urgent' || /urgent/i.test(p.title || '')) {
          riskScore += 20;
          flags.push('Fast-tracked Urgent Procurement');
        }

        return {
          referenceNumber: p.referenceNumber,
          title: p.title,
          estimatedCostLKR: est,
          department: p.department,
          riskScore: Math.min(riskScore, 100),
          riskLevel: riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW',
          riskFlags: flags,
          recommendation: riskScore > 60 ? 'Requires mandatory Bursar + Internal Audit Pre-Check before tender award.' : 'Standard TEC evaluation permitted.'
        };
      });

      results = riskEvaluations.length > 0 ? riskEvaluations : [{
        overallRisk: 'LOW',
        riskScore: 20,
        message: 'No specific risk flags found for the given criteria.'
      }];
    } else if (model === 'vendor_ranking') {
      const vendors = await Vendor.find({ tenantId: 'uwu-main', isBlacklisted: false })
        .select('companyName registrationNumber performanceScore ratingTier category completedContracts')
        .sort({ performanceScore: -1 })
        .limit(10)
        .lean();

      results = vendors.map((v, idx) => ({
        rank: idx + 1,
        companyName: v.companyName,
        registrationNumber: v.registrationNumber,
        performanceScore: v.performanceScore || 85,
        ratingTier: v.ratingTier || 'Tier A',
        category: v.category,
        completedContracts: v.completedContracts || 0,
      }));
    } else {
      return res.status(400).json({ success: false, message: `Unsupported model: ${model}. Supported: procurement, tender, vendor, bid, contract, budget, inventory, payment, stats, gosl_compliance, risk_analysis, vendor_ranking` });
    }

    return success(res, results);
  } catch (err) { next(err); }
};

/**
 * Upload document to Flowise Knowledge Base (Document Store)
 * POST /ai/knowledge/upload
 */
const uploadKnowledgeDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
      const result = await aiService.uploadToFlowise(filePath, fileName);
      
      // Delete temporary file from local storage
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return success(res, result, 'Document uploaded to Knowledge Base successfully');
    } catch (uploadErr) {
      // Clean up file if Flowise upload failed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw uploadErr;
    }
  } catch (err) { next(err); }
};

/**
 * Get all documents (loaders) in Flowise Knowledge Base
 * GET /ai/knowledge/documents
 */
const getKnowledgeDocuments = async (req, res, next) => {
  try {
    const documents = await aiService.getKnowledgeDocuments();
    return success(res, documents);
  } catch (err) { next(err); }
};

/**
 * Delete a document from Flowise Knowledge Base
 * DELETE /ai/knowledge/documents/:id
 */
const deleteKnowledgeDocument = async (req, res, next) => {
  try {
    const loaderId = req.params.id;
    if (!loaderId) {
      return res.status(400).json({ success: false, message: 'Document loader ID is required' });
    }

    const result = await aiService.deleteKnowledgeDocument(loaderId);
    return success(res, result, 'Document deleted from Knowledge Base');
  } catch (err) { next(err); }
};

/**
 * Trigger processing/upserting of all documents in the store
 * POST /ai/knowledge/process
 */
const processKnowledgeBase = async (req, res, next) => {
  try {
    const result = await aiService.processDocumentStore();
    return success(res, result, 'Knowledge Base sync/processing started');
  } catch (err) { next(err); }
};

/**
 * Scan & index target Documents folder (e.g. Documents/*.pdf) into RAG Knowledge Base
 * POST /ai/knowledge/scan-folder
 */
const scanDocumentsFolder = async (req, res, next) => {
  try {
    const { folderPath } = req.body;
    const results = await aiService.indexDocumentsFolder(folderPath, req.tenantId);
    return success(res, { documents: results, count: results.length }, 'Target Documents folder successfully indexed for RAG');
  } catch (err) { next(err); }
};

/**
 * Flowise Prediction Proxy
 * POST /ai/prediction/:chatflowId
 */
const proxyFlowisePrediction = async (req, res, next) => {
  try {
    const env = require('../config/env');
    const chatflowId = req.params.chatflowId || env.FLOWISE_CHATFLOW_ID;
    const targetUrl = `${env.FLOWISE_API_URL}/prediction/${chatflowId}`;

    const headers = { 'Content-Type': 'application/json' };
    if (env.FLOWISE_API_KEY) {
      headers['Authorization'] = `Bearer ${env.FLOWISE_API_KEY}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * Feature 10: AI Vendor Technical Scoring
 * POST /ai/score-bidder/:tenderId/:bidId
 */
const scoreBidderAI = async (req, res, next) => {
  try {
    const { tenderId, bidId } = req.params;
    const tender = await Tender.findOne({ _id: tenderId, tenantId: req.tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });

    const bid = await Bid.findOne({ _id: bidId, tenderId, tenantId: req.tenantId }).populate('vendorId');
    if (!bid) throw Object.assign(new Error('Bid not found'), { statusCode: 404 });

    const criteria = req.body.criteria || tender.technicalCriteria || [];
    const evaluation = await aiService.scoreBidderAI(tender, bid, criteria);

    // Save evaluation to DB
    await tenderService.evaluateBid(tenderId, bidId, {
      technicalScores: evaluation.technicalScores,
      notes: evaluation.overallNotes,
    }, req.user._id, req.tenantId);

    if (evaluation.explainabilityLog) {
      await explainabilityService.recordLog(evaluation.explainabilityLog, {
        userId: req.user._id,
        tenantId: req.tenantId,
        tenderId: tender._id,
      });
    }

    return success(res, evaluation, 'AI Vendor Scoring completed');
  } catch (err) { next(err); }
};

/**
 * Feature 10 (Bulk): AI Score All Bidders for Tender
 * POST /ai/score-all-bidders/:tenderId
 */
const scoreAllBiddersAI = async (req, res, next) => {
  try {
    const { tenderId } = req.params;
    const tender = await Tender.findOne({ _id: tenderId, tenantId: req.tenantId });
    if (!tender) throw Object.assign(new Error('Tender not found'), { statusCode: 404 });

    const bids = await Bid.find({ tenderId, tenantId: req.tenantId }).populate('vendorId');
    if (!bids || bids.length === 0) {
      return success(res, { evaluations: [] }, 'No bids found to score');
    }

    const criteria = req.body.criteria || tender.technicalCriteria || [];
    const evaluations = [];

    for (const bid of bids) {
      const evaluation = await aiService.scoreBidderAI(tender, bid, criteria);
      await tenderService.evaluateBid(tenderId, bid._id, {
        technicalScores: evaluation.technicalScores,
        notes: evaluation.overallNotes,
      }, req.user._id, req.tenantId);

      if (evaluation.explainabilityLog) {
        await explainabilityService.recordLog(evaluation.explainabilityLog, {
          userId: req.user._id,
          tenantId: req.tenantId,
          tenderId: tender._id,
        });
      }
      evaluations.push(evaluation);
    }

    return success(res, { evaluations }, 'AI scoring completed for all bidders');
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
  proxyFlowisePrediction,
  runInternalQuery,
  uploadKnowledgeDocument,
  getKnowledgeDocuments,
  deleteKnowledgeDocument,
  processKnowledgeBase,
  scanDocumentsFolder,
  // New chat session endpoints
  getChatSessions,
  getChatHistory,
  deleteChatSession,
  renameChatSession,
  togglePinSession,
  rateChatMessage,
  // AI Vendor Technical Scoring
  scoreBidderAI,
  scoreAllBiddersAI,
};



