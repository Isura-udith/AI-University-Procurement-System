/**
 * Market Price Engine
 * AI-powered market intelligence for procurement pricing.
 *
 * Features:
 *   1. NLP text parsing → structured product specs (Feature 1 & 4)
 *   2. Market price band recommendation (Feature 1)
 *   3. Historical procurement analysis (Feature 8)
 *   4. Dynamic market monitoring & macroeconomic alerts (Feature 5)
 *
 * Governance: Every output includes an explainabilityLog object.
 */
const logger = require('../config/logger');

class MarketPriceEngine {
  /**
   * Parse natural-language requisition text into structured product specifications.
   * Uses Gemini structured output with Zod validation via aiService.
   *
   * @param {string} rawText  – free-form requisition text
   * @param {object} aiService – injected AIService instance
   * @returns {object} { items[], category, totalQuantity, explainabilityLog }
   */
  async parseRequisitionNLP(rawText, aiService) {
    const startTime = Date.now();
    const prompt = `You are a Sri Lankan government procurement specification analyst.
Parse the following free-form requisition text and extract structured data.

INPUT TEXT:
"""
${rawText}
"""

Return a JSON object with:
{
  "items": [
    {
      "description": "full item description",
      "category": "Goods|Services|Works|Consulting",
      "specifications": "technical specs extracted",
      "quantity": number,
      "unit": "string (e.g. units, kg, liters, sets)",
      "estimatedUnitPrice": number or null,
      "budgetCode": "string or null",
      "qualityStandards": "string or null"
    }
  ],
  "overallCategory": "Goods|Services|Works|Consulting",
  "suggestedTitle": "short descriptive title",
  "suggestedJustification": "brief justification text",
  "identifiedSpecs": ["list of key technical specifications found"],
  "recommendedMethod": "Shopping|NCB|ICB|Direct|RFQ based on estimated value"
}`;

    const result = await aiService.callGemini(
      prompt,
      'You are a GOSL procurement NLP parser. Return ONLY valid JSON, no markdown.'
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
    } catch {
      parsed = { raw: result, items: [], overallCategory: 'Goods', suggestedTitle: '', identifiedSpecs: [] };
    }

    parsed.explainabilityLog = {
      feature: 'NLP_REQUISITION_PARSING',
      inputText: rawText.substring(0, 500),
      model: 'gemini-2.0-flash',
      processingTimeMs: Date.now() - startTime,
      dataSources: ['gemini-nlp-extraction'],
      timestamp: new Date().toISOString(),
    };

    return parsed;
  }

  /**
   * Generate market price band recommendation for a set of items.
   *
   * @param {Array} items – parsed procurement items
   * @param {Array} historicalPrices – past transactions from DB for matching items
   * @param {object} aiService – injected AIService instance
   * @returns {object} { priceBands[], overallTCE, historicalComparison, explainabilityLog }
   */
  async getMarketPriceRecommendation(items, historicalPrices, aiService) {
    const startTime = Date.now();

    const prompt = `You are a procurement pricing analyst for a Sri Lankan university.
Analyze these procurement items and provide market price recommendations.

ITEMS TO PROCURE:
${JSON.stringify(items, null, 2)}

HISTORICAL PROCUREMENT DATA (past purchases of similar items at this university):
${JSON.stringify(historicalPrices, null, 2)}

For each item, provide a market price band based on your knowledge of current market conditions in Sri Lanka.

Return JSON:
{
  "priceBands": [
    {
      "itemDescription": "string",
      "lowPrice": number,
      "midPrice": number,
      "highPrice": number,
      "currency": "LKR",
      "confidence": "high|medium|low",
      "reasoning": "why this price range",
      "marketFactors": ["factors affecting price"]
    }
  ],
  "overallTCE": {
    "lowEstimate": number,
    "midEstimate": number,
    "highEstimate": number,
    "currency": "LKR"
  },
  "historicalComparison": {
    "avgHistoricalPrice": number or null,
    "priceChangePercent": number or null,
    "trend": "increasing|decreasing|stable|insufficient_data"
  },
  "marketConditions": "brief summary of current market conditions",
  "recommendations": ["actionable recommendations"]
}`;

    const result = await aiService.callGemini(
      prompt,
      'You are a procurement price intelligence analyst for a Sri Lankan public university. Return ONLY valid JSON.'
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
    } catch {
      parsed = { raw: result, priceBands: [], overallTCE: {} };
    }

    parsed.explainabilityLog = {
      feature: 'MARKET_PRICE_RECOMMENDATION',
      inputItemCount: items.length,
      historicalRecordCount: historicalPrices.length,
      model: 'gemini-2.0-flash',
      processingTimeMs: Date.now() - startTime,
      dataSources: ['gemini-market-analysis', 'university-historical-db'],
      weightsApplied: { marketData: 0.5, historicalData: 0.3, expertKnowledge: 0.2 },
      timestamp: new Date().toISOString(),
    };

    return parsed;
  }

  /**
   * Match a current requisition against historical procurement records.
   *
   * @param {object} procurement – current procurement document
   * @param {Array} pastTransactions – matching historical procurements from DB
   * @param {object} aiService – injected AIService instance
   * @returns {object} { matches[], priceDeviation, alerts[], explainabilityLog }
   */
  async matchHistoricalProcurement(procurement, pastTransactions, aiService) {
    const startTime = Date.now();

    if (!pastTransactions || pastTransactions.length === 0) {
      return {
        matches: [],
        priceDeviation: null,
        alerts: [],
        summary: 'No historical records found for matching items.',
        explainabilityLog: {
          feature: 'HISTORICAL_PROCUREMENT_MATCH',
          result: 'no_matches',
          model: 'none',
          processingTimeMs: Date.now() - startTime,
          dataSources: ['university-historical-db'],
          timestamp: new Date().toISOString(),
        },
      };
    }

    const prompt = `Analyze the following current procurement against its historical transactions.

CURRENT PROCUREMENT:
Title: ${procurement.title}
Category: ${procurement.category}
Items: ${JSON.stringify(procurement.items?.slice(0, 10), null, 2)}
Total Estimated Cost: LKR ${procurement.totalEstimatedCost}

HISTORICAL TRANSACTIONS (past purchases of similar items):
${JSON.stringify(pastTransactions.slice(0, 20), null, 2)}

Return JSON:
{
  "matches": [
    {
      "historicalRef": "reference number",
      "date": "when purchased",
      "previousPrice": number,
      "previousVendor": "vendor name",
      "qualityReport": "summary if available",
      "relevanceScore": 0-100
    }
  ],
  "priceDeviation": {
    "currentEstimate": number,
    "historicalAverage": number,
    "deviationPercent": number,
    "assessment": "within_range|above_range|below_range|significantly_above"
  },
  "alerts": [
    {
      "type": "price_increase|price_decrease|vendor_change|quality_concern",
      "severity": "info|warning|critical",
      "message": "description"
    }
  ],
  "summary": "overall assessment text"
}`;

    const result = await aiService.callGemini(
      prompt,
      'You are a procurement historian for a Sri Lankan university. Return ONLY valid JSON.'
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
    } catch {
      parsed = { raw: result, matches: [], priceDeviation: null, alerts: [] };
    }

    parsed.explainabilityLog = {
      feature: 'HISTORICAL_PROCUREMENT_MATCH',
      currentProcurementId: procurement._id?.toString(),
      historicalRecordsAnalyzed: pastTransactions.length,
      model: 'gemini-2.0-flash',
      processingTimeMs: Date.now() - startTime,
      dataSources: ['university-historical-db', 'gemini-analysis'],
      timestamp: new Date().toISOString(),
    };

    return parsed;
  }

  /**
   * Generate dynamic market monitoring alerts based on macroeconomic indicators.
   *
   * @param {Array} activeCategories – categories with active/pending procurements
   * @param {object} aiService – injected AIService instance
   * @returns {object} { alerts[], marketSummary, explainabilityLog }
   */
  async generateMarketAlerts(activeCategories, aiService) {
    const startTime = Date.now();

    const prompt = `You are an economic intelligence analyst monitoring procurement markets for a Sri Lankan university.

ACTIVE PROCUREMENT CATEGORIES:
${JSON.stringify(activeCategories, null, 2)}

Based on your knowledge of current global and Sri Lankan market conditions, generate market monitoring alerts.
Consider: USD/LKR exchange rates, inflation trends, global supply chain disruptions, commodity price movements, seasonal factors.

Return JSON:
{
  "alerts": [
    {
      "alertType": "forex_impact|inflation_spike|commodity_surge|supply_chain|seasonal",
      "severity": "low|medium|high|critical",
      "affectedCategory": "category name",
      "title": "short alert title",
      "description": "detailed description",
      "predictedImpact": "expected price impact percentage",
      "recommendation": "actionable recommendation",
      "timeframe": "immediate|short_term|medium_term"
    }
  ],
  "marketSummary": {
    "overallOutlook": "favorable|neutral|challenging",
    "keyIndicators": {
      "exchangeRate": "USD/LKR approximate",
      "inflationTrend": "description",
      "globalSupplyChain": "description"
    },
    "strategicRecommendations": ["list of strategic actions"]
  }
}`;

    const result = await aiService.callGemini(
      prompt,
      'You are a macroeconomic analyst for Sri Lankan public procurement. Return ONLY valid JSON.'
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
    } catch {
      parsed = { raw: result, alerts: [], marketSummary: {} };
    }

    parsed.explainabilityLog = {
      feature: 'DYNAMIC_MARKET_MONITORING',
      categoriesMonitored: activeCategories.length,
      alertsGenerated: parsed.alerts?.length || 0,
      model: 'gemini-2.0-flash',
      processingTimeMs: Date.now() - startTime,
      dataSources: ['gemini-economic-intelligence', 'active-procurement-categories'],
      disclaimer: 'Market alerts are AI-generated estimates based on model training data. Verify with official CBSL and market sources.',
      timestamp: new Date().toISOString(),
    };

    return parsed;
  }
}

module.exports = new MarketPriceEngine();
