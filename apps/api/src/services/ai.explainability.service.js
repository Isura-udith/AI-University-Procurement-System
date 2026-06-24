/**
 * AI Explainability Service
 * Governance Rule 2: Every AI output gets a persistent audit trail.
 */
const AIExplainabilityLog = require('../models/ai.explainability.log.model');
const logger = require('../config/logger');

class AIExplainabilityService {
  /**
   * Record an AI explainability log entry.
   *
   * @param {object} logData – explainability log from an AI engine
   * @param {object} context – { userId, tenantId, procurementId, tenderId, vendorId }
   * @returns {object} saved log document
   */
  async recordLog(logData, context = {}) {
    try {
      const log = await AIExplainabilityLog.create({
        tenantId: context.tenantId || 'uwu-main',
        aiFeature: logData.feature,
        inputSummary: logData.inputText || logData.inputItemCount?.toString() || '',
        inputData: logData.inputData || null,
        model: logData.model,
        temperature: logData.temperature,
        promptUsed: logData.promptUsed,
        weightsApplied: logData.weightsApplied,
        thresholdsUsed: logData.thresholdsUsed,
        scoringFormula: logData.formula || logData.scoringFormula,
        dataSources: logData.dataSources || [],
        outputSummary: logData.result || logData.outputSummary || '',
        outputData: logData.outputData || null,
        processingTimeMs: logData.processingTimeMs,
        procurementId: context.procurementId || logData.procurementId,
        tenderId: context.tenderId || logData.tenderId,
        vendorId: context.vendorId || logData.vendorId,
        generatedBy: context.userId,
        disclaimer: logData.disclaimer,
      });
      return log;
    } catch (error) {
      logger.error('Failed to record AI explainability log', { error: error.message });
      return null;
    }
  }

  /**
   * Query explainability logs with filtering and pagination.
   */
  async getLogs(query, tenantId) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const filters = { tenantId };

    if (query.feature) filters.aiFeature = query.feature;
    if (query.procurementId) filters.procurementId = query.procurementId;
    if (query.tenderId) filters.tenderId = query.tenderId;
    if (query.vendorId) filters.vendorId = query.vendorId;
    if (query.userId) filters.generatedBy = query.userId;
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.$lte = new Date(query.endDate);
    }

    const [data, total] = await Promise.all([
      AIExplainabilityLog.find(filters)
        .populate('generatedBy', 'firstName lastName email role')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      AIExplainabilityLog.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get a single log by ID.
   */
  async getLogById(id, tenantId) {
    const log = await AIExplainabilityLog.findOne({ _id: id, tenantId })
      .populate('generatedBy', 'firstName lastName email role')
      .populate('procurementId', 'referenceNumber title')
      .populate('tenderId', 'tenderNumber title')
      .populate('vendorId', 'companyName');
    if (!log) throw Object.assign(new Error('Log not found'), { statusCode: 404 });
    return log;
  }

  /**
   * Get AI activity stats.
   */
  async getStats(tenantId) {
    const [total, byFeature, recentCount] = await Promise.all([
      AIExplainabilityLog.countDocuments({ tenantId }),
      AIExplainabilityLog.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$aiFeature', count: { $sum: 1 }, avgProcessingTime: { $avg: '$processingTimeMs' } } },
        { $sort: { count: -1 } },
      ]),
      AIExplainabilityLog.countDocuments({
        tenantId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);
    return { total, byFeature, last24h: recentCount };
  }
}

module.exports = new AIExplainabilityService();
