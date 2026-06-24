/**
 * Price Prediction - AI-powered price intelligence and anomaly detection
 */
const aiService = require('../services/ai.service');
const logger = require('../config/logger');

const analyzePriceAnomaly = (bids, engineersEstimate) => {
  if (!bids || bids.length === 0) return { anomalies: [] };
  const prices = bids.map(b => b.totalBidAmount);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length);
  const threshold = 0.25;
  const anomalies = bids.filter(b => {
    const deviation = Math.abs(b.totalBidAmount - mean) / mean;
    return deviation > threshold;
  }).map(b => ({
    vendorId: b.vendorId,
    bidAmount: b.totalBidAmount,
    deviation: ((b.totalBidAmount - mean) / mean * 100).toFixed(2) + '%',
    type: b.totalBidAmount > mean ? 'overpriced' : 'underpriced',
  }));
  const comparisonToEstimate = engineersEstimate ? ((mean - engineersEstimate) / engineersEstimate * 100).toFixed(2) + '%' : null;
  return { mean, stdDev, anomalies, comparisonToEstimate, bidCount: bids.length };
};

const predictFuturePrice = async (category, historicalPrices) => {
  try {
    return await aiService.analyzePricing(historicalPrices, { category });
  } catch (error) {
    logger.error('Price prediction failed', { error: error.message });
    return null;
  }
};

module.exports = { analyzePriceAnomaly, predictFuturePrice };
