/**
 * Fraud Detection - Statistical bid pattern analysis
 */
const logger = require('../config/logger');

const detectBidCollusion = (bids) => {
  if (!bids || bids.length < 3) return { collusionRisk: 'insufficient_data', patterns: [] };
  const prices = bids.map(b => b.totalBidAmount).sort((a, b) => a - b);
  const patterns = [];
  
  // Check for price clustering (similar prices)
  for (let i = 0; i < prices.length - 1; i++) {
    const diff = Math.abs(prices[i + 1] - prices[i]) / prices[i];
    if (diff < 0.02) {
      patterns.push({ type: 'price_clustering', description: `Bids ${i + 1} and ${i + 2} are within 2% of each other`, severity: 'high' });
    }
  }
  
  // Check for round number patterns
  const roundBids = bids.filter(b => b.totalBidAmount % 100000 === 0);
  if (roundBids.length > bids.length * 0.5) {
    patterns.push({ type: 'round_numbers', description: 'More than 50% of bids are round numbers', severity: 'medium' });
  }
  
  // Check for sequential pricing
  const sorted = [...prices];
  let isSequential = true;
  for (let i = 1; i < sorted.length; i++) {
    const increment = sorted[i] - sorted[i - 1];
    if (i > 1 && Math.abs(increment - (sorted[i - 1] - sorted[i - 2])) > increment * 0.1) {
      isSequential = false;
      break;
    }
  }
  if (isSequential && prices.length >= 3) {
    patterns.push({ type: 'sequential_pricing', description: 'Bid prices show sequential/arithmetic pattern', severity: 'critical' });
  }

  const collusionRisk = patterns.some(p => p.severity === 'critical') ? 'high' : patterns.length > 1 ? 'medium' : patterns.length > 0 ? 'low' : 'none';
  return { collusionRisk, patterns, analyzedBids: bids.length };
};

const detectBidRigging = (bids, vendorHistory) => {
  const patterns = [];
  // Check rotation patterns
  if (vendorHistory && vendorHistory.length > 5) {
    const winners = vendorHistory.map(h => h.winnerId?.toString());
    const uniqueWinners = [...new Set(winners)];
    if (uniqueWinners.length <= 2 && vendorHistory.length > 5) {
      patterns.push({ type: 'rotation_pattern', description: 'Same vendors winning alternately', severity: 'high' });
    }
  }
  return { patterns };
};

module.exports = { detectBidCollusion, detectBidRigging };
