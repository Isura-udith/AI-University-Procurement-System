/**
 * Anomaly Detection - Statistical and ML-based anomaly detection for procurement
 */
const logger = require('../config/logger');

const detectBudgetAnomalies = (spendData, allocations) => {
  const anomalies = [];
  if (!spendData || !allocations) return anomalies;
  
  Object.keys(allocations).forEach(dept => {
    const allocated = allocations[dept];
    const spent = spendData[dept] || 0;
    const utilization = (spent / allocated) * 100;
    
    if (utilization > 90) {
      anomalies.push({ department: dept, type: 'budget_overrun_risk', utilization: utilization.toFixed(1), severity: utilization > 100 ? 'critical' : 'warning', message: `${dept} at ${utilization.toFixed(1)}% budget utilization` });
    }
    if (utilization < 20 && new Date().getMonth() > 5) {
      anomalies.push({ department: dept, type: 'budget_underutilization', utilization: utilization.toFixed(1), severity: 'info', message: `${dept} showing low spend at ${utilization.toFixed(1)}%` });
    }
  });
  return anomalies;
};

const detectProcessAnomalies = (procurement) => {
  const anomalies = [];
  if (!procurement) return anomalies;
  
  // Check for unusually fast approvals
  if (procurement.approvalChain) {
    procurement.approvalChain.forEach(stage => {
      if (stage.actionDate && procurement.submittedAt) {
        const hours = (stage.actionDate - procurement.submittedAt) / (1000 * 60 * 60);
        if (hours < 0.5) {
          anomalies.push({ type: 'rapid_approval', severity: 'warning', message: `${stage.stage} approved in under 30 minutes` });
        }
      }
    });
  }
  
  // Check for split procurement (avoiding thresholds)
  if (procurement.totalEstimatedCost) {
    const thresholds = [500000, 5000000, 50000000];
    thresholds.forEach(t => {
      const pct = procurement.totalEstimatedCost / t;
      if (pct > 0.85 && pct < 1.0) {
        anomalies.push({ type: 'threshold_proximity', severity: 'warning', message: `Amount is ${(pct * 100).toFixed(0)}% of LKR ${t.toLocaleString()} threshold` });
      }
    });
  }
  return anomalies;
};

module.exports = { detectBudgetAnomalies, detectProcessAnomalies };
