/**
 * Vendor Scoring - AI-driven multi-criteria vendor evaluation
 */
const aiService = require('../services/ai.service');
const logger = require('../config/logger');

const calculateVendorScore = (vendor) => {
  const weights = { deliveryTimeliness: 0.25, qualityRating: 0.25, priceCompetitiveness: 0.2, complianceScore: 0.2, completionRate: 0.1 };
  const m = vendor.metrics || {};
  const completionRate = m.totalContracts > 0 ? (m.completedContracts / m.totalContracts) * 100 : 0;
  const score = (m.deliveryTimeliness || 0) * weights.deliveryTimeliness + ((m.qualityRating || 0) * 20) * weights.qualityRating + (m.priceCompetitiveness || 0) * weights.priceCompetitiveness + (m.complianceScore || 0) * weights.complianceScore + completionRate * weights.completionRate;
  return Math.round(Math.min(100, Math.max(0, score)));
};

const rankVendorsForTender = async (vendors, tenderRequirements) => {
  const ranked = vendors.map(vendor => ({
    vendorId: vendor._id,
    companyName: vendor.companyName,
    performanceScore: calculateVendorScore(vendor),
    status: vendor.status,
    isDebarred: vendor.isDebarred,
    relevantExperience: vendor.metrics?.totalContracts || 0,
  }));
  return ranked.filter(v => !v.isDebarred && v.status !== 'blacklisted').sort((a, b) => b.performanceScore - a.performanceScore);
};

const getAIVendorAssessment = async (vendor) => {
  try {
    return await aiService.assessVendor(vendor, vendor.bidHistory || []);
  } catch (error) {
    logger.error('AI vendor assessment failed', { error: error.message, vendorId: vendor._id });
    return null;
  }
};

module.exports = { calculateVendorScore, rankVendorsForTender, getAIVendorAssessment };
