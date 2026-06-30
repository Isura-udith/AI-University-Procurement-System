const logger = require('../config/logger');
const aiConfig = require('../config/ai.config');

class DemandForecastingEngine {
  /**
   * Generate demand forecasts for the next quarter.
   *
   * @param {string} faculty – faculty name (or 'all')
   * @param {string} category – procurement category (or 'all')
   * @param {Array} historicalData – past procurement records
   * @param {object} aiService – injected AIService instance
   * @returns {object}
   */
  async forecastDemand(faculty, category, historicalData, aiService) {
    const startTime = Date.now();

    // Statistical pre-analysis
    const stats = this._computeHistoricalStats(historicalData);

    const prompt = `You are a demand forecasting analyst for Uva Wellassa University (UWU), Sri Lanka.

Predict procurement demand for the next quarter based on historical patterns.

QUERY:
Faculty: ${faculty || 'All faculties'}
Category: ${category || 'All categories'}
Current Month: ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}

HISTORICAL PROCUREMENT DATA (${historicalData?.length || 0} records):
${JSON.stringify(stats, null, 2)}

ACADEMIC CALENDAR CONTEXT:
- Semester 1: January-May (lab equipment, stationery peaks)
- Semester 2: July-November (IT equipment, furniture peaks)
- Year-end: November-December (budget utilization rush)
- Academic breaks: June, December (maintenance & capital works)

Return JSON:
{
  "predictions": [
    {
      "month": "string",
      "category": "string",
      "predictedValue": number,
      "predictedQuantity": number,
      "confidence": "high|medium|low",
      "reasoning": "string"
    }
  ],
  "seasonality": {
    "peakMonths": ["string"],
    "lowMonths": ["string"],
    "pattern": "description of seasonal pattern"
  },
  "totalForecastValue": number,
  "yearOverYearChange": "string (e.g., +12% increase)",
  "recommendations": [
    {
      "action": "string",
      "priority": "high|medium|low",
      "category": "string",
      "estimatedSavings": "string or null",
      "timeframe": "immediate|short_term|medium_term"
    }
  ],
  "inventoryAlerts": [
    {
      "item": "string",
      "currentStockEstimate": "adequate|low|critical",
      "reorderRecommendation": "string"
    }
  ]
}`;

    try {
      const result = await aiService.callGemini(
        prompt,
        'You are a university procurement demand forecasting analyst. Return ONLY valid JSON.'
      );

      let parsed;
      try {
        parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
      } catch {
        parsed = { raw: result, predictions: [] };
      }

      parsed.historicalStats = stats;
      parsed.explainabilityLog = {
        feature: 'DEMAND_FORECASTING',
        faculty,
        category,
        historicalRecords: historicalData?.length || 0,
        model: aiConfig.gemini.model,
        processingTimeMs: Date.now() - startTime,
        dataSources: ['university-procurement-history', 'academic-calendar', 'gemini-prediction'],
        disclaimer: 'Forecasts are AI-generated estimates. Actual demand may vary based on policy changes, budget allocations, and unforeseen events.',
        timestamp: new Date().toISOString(),
      };

      return parsed;
    } catch (error) {
      logger.error('Demand forecasting failed', { error: error.message, faculty, category });
      return {
        predictions: [],
        historicalStats: stats,
        error: 'Forecasting temporarily unavailable',
        explainabilityLog: {
          feature: 'DEMAND_FORECASTING',
          error: error.message,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Compute basic statistical summaries from historical procurement data.
   * @private
   */
  _computeHistoricalStats(data) {
    if (!data || data.length === 0) {
      return { totalRecords: 0, summary: 'No historical data available' };
    }

    const byCategory = {};
    const byMonth = {};
    const byFaculty = {};
    let totalValue = 0;

    data.forEach(record => {
      const cat = record.category || 'Unknown';
      const month = record.createdAt
        ? new Date(record.createdAt).toLocaleString('en-US', { month: 'short' })
        : 'Unknown';
      const faculty = record.faculty || record.department || 'Unknown';
      const value = record.totalEstimatedCost || 0;

      byCategory[cat] = (byCategory[cat] || 0) + value;
      byMonth[month] = (byMonth[month] || 0) + value;
      byFaculty[faculty] = (byFaculty[faculty] || 0) + value;
      totalValue += value;
    });

    return {
      totalRecords: data.length,
      totalValue,
      avgValue: Math.round(totalValue / data.length),
      byCategory,
      byMonth,
      byFaculty,
    };
  }
}

module.exports = new DemandForecastingEngine();
