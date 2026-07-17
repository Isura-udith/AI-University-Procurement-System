const { z } = require('zod');
const aiConfig = require('../config/ai.config');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.apiKey = aiConfig.gemini.apiKey;
    this.baseUrl = aiConfig.gemini.baseUrl;
    this.model = aiConfig.gemini.model;
    this.maxRetries = 3;
  }

  isConfigured() {
    return Boolean(
      this.apiKey &&
      this.apiKey !== 'your_gemini_api_key_here' &&
      !String(this.apiKey).toLowerCase().includes('your_')
    );
  }

  async callGemini(prompt, systemInstruction = '', options = {}) {
    const temperature = options.temperature ?? aiConfig.gemini.temperature;
    const maxTokens = options.maxTokens ?? aiConfig.gemini.maxTokens;
    const maxRetries = options.retries ?? this.maxRetries;
    const responseMimeType = options.responseMimeType || (
      /return\s+(only\s+)?valid\s+json|return\s+json|json object/i.test(`${systemInstruction}\n${prompt}`)
        ? 'application/json'
        : 'text/plain'
    );

    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured. Real inputs require a valid API key.');
    }

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType,
          },
        };

        if (systemInstruction) {
          body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 && attempt < maxRetries) {
            const waitMs = Math.pow(2, attempt) * 1000;
            logger.warn(`Gemini rate limited, retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          throw new Error(`Gemini API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) {
          throw new Error(`Gemini returned an empty response (${data.promptFeedback?.blockReason || 'no candidate text'})`);
        }
        return text;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 500;
          logger.warn(`Gemini call failed, retrying in ${waitMs}ms`, { error: error.message, attempt });
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }

    logger.error('Gemini API call failed after all retries.', { error: lastError?.message });
    throw lastError || new Error('Gemini API call failed');
  }

  /**
   * Parse Gemini response as JSON with Zod schema validation.
   *
   * @param {string} rawText – raw Gemini response
   * @param {z.ZodSchema} schema – Zod schema to validate against
   * @returns {object} parsed and validated JSON
   */
  parseAndValidate(rawText, schema) {
    // Strip markdown code fences
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.warn('Failed to parse Gemini JSON response', { rawText: cleaned.substring(0, 200) });
      return { _parseError: true, raw: cleaned };
    }

    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        logger.warn('Gemini response failed Zod validation', {
          errors: result.error.errors.slice(0, 5),
        });
        // Return parsed but mark as unvalidated
        return { ...parsed, _validationErrors: result.error.errors.slice(0, 5) };
      }
      return result.data;
    }

    return parsed;
  }

  // ========================
  // Feature-Specific Methods
  // ========================

  /**
   * Feature 1 & 4: Parse requisition text and extract structured data.
   */
  async parseRequisitionNLP(rawText) {
    const marketEngine = require('../ai/market.price.engine');
    return marketEngine.parseRequisitionNLP(rawText, this);
  }

  /**
   * Feature 1: Get market price recommendation.
   */
  async getMarketPriceRecommendation(items, historicalPrices) {
    const marketEngine = require('../ai/market.price.engine');
    return marketEngine.getMarketPriceRecommendation(items, historicalPrices, this);
  }

  /**
   * Feature 2: Verify seller quotations.
   */
  async verifyQuotations(bids, engineersEstimate, historicalPrices, options) {
    const quotationEngine = require('../ai/quotation.analysis');
    return quotationEngine.verifyQuotations(bids, engineersEstimate, historicalPrices, options, this);
  }

  /**
   * Feature 3: Generate smart recommendations.
   */
  async generateSmartRecommendations(bids, tender, vendorAssessments) {
    const recEngine = require('../ai/procurement.recommendation');
    return recEngine.generateRecommendations(bids, tender, vendorAssessments, this);
  }

  /**
   * Feature 5: Generate market monitoring alerts.
   */
  async generateMarketAlerts(activeCategories) {
    const marketEngine = require('../ai/market.price.engine');
    return marketEngine.generateMarketAlerts(activeCategories, this);
  }

  /**
   * Feature 6: Calculate procurement risk score.
   */
  async calculateRiskScore(procurement, vendors, marketData) {
    const riskEngine = require('../ai/risk.analysis');
    return riskEngine.calculateRiskScore(procurement, vendors, marketData, this);
  }

  /**
   * Feature 7: Generate comparative analysis.
   */
  async generateComparativeAnalysis(bids, evaluationCriteria) {
    const quotationEngine = require('../ai/quotation.analysis');
    return quotationEngine.generateComparativeAnalysis(bids, evaluationCriteria, this);
  }

  /**
   * Feature 8: Match historical procurement.
   */
  async matchHistoricalProcurement(procurement, pastTransactions) {
    const marketEngine = require('../ai/market.price.engine');
    return marketEngine.matchHistoricalProcurement(procurement, pastTransactions, this);
  }

  /**
   * Feature 9: Demand forecasting.
   */
  async forecastDemand(faculty, category, historicalData) {
    const demandEngine = require('../ai/demand.forecasting');
    return demandEngine.forecastDemand(faculty, category, historicalData, this);
  }

  /**
   * Vendor assessment (enhanced).
   */
  async assessVendor(vendor) {
    const vendorEngine = require('../ai/vendor.ranking');
    return vendorEngine.getAIVendorAssessment(vendor, this);
  }

  /**
   * Legacy compatibility: Analyze specification.
   */
  async analyzeSpecification(specification) {
    const prompt = `${aiConfig.prompts.specAnalysis}\n\nSpecification:\n${specification}\n\nProvide response as JSON with fields: categories, quantities, qualityRequirements, complianceStandards, recommendedMethod, estimatedValue, riskFactors.`;
    const result = await this.callGemini(prompt, 'You are a GOSL procurement specification analyst. Return valid JSON only.');
    return this.parseAndValidate(result);
  }

  /**
   * Legacy compatibility: Analyze pricing.
   */
  async analyzePricing(items, historicalData) {
    const prompt = `${aiConfig.prompts.priceIntelligence}\n\nCurrent Items:\n${JSON.stringify(items)}\n\nHistorical Data:\n${JSON.stringify(historicalData)}\n\nAnalyze and return JSON with: benchmarkComparison, anomalies, recommendations, overallAssessment, savingsOpportunity.`;
    const result = await this.callGemini(prompt, 'You are a procurement price intelligence analyst for a Sri Lankan university.');
    return this.parseAndValidate(result);
  }

  /**
   * Legacy compatibility: Evaluate bid.
   */
  async evaluateBid(bid, criteria, engineersEstimate) {
    const prompt = `${aiConfig.prompts.bidEvaluation}\n\nBid:\n${JSON.stringify(bid)}\n\nCriteria:\n${JSON.stringify(criteria)}\n\nEngineer's Estimate: ${engineersEstimate}\n\nReturn JSON: technicalScore, strengths, weaknesses, complianceIssues, priceAnalysis, recommendation.`;
    const result = await this.callGemini(prompt, 'You are a bid evaluation specialist following GOSL 2024 procurement guidelines.');
    return this.parseAndValidate(result);
  }

  /**
   * Legacy compatibility: Detect fraud.
   */
  async detectFraud(bids) {
    const prompt = `${aiConfig.prompts.fraudDetection}\n\nBids Data:\n${JSON.stringify(bids)}\n\nReturn JSON: collusionRisk, patterns, flaggedBids, statisticalEvidence, recommendation.`;
    const result = await this.callGemini(prompt, 'You are a fraud detection specialist analyzing procurement bid patterns.');
    return this.parseAndValidate(result);
  }

  /**
   * Legacy compatibility: Budget forecast.
   */
  async generateBudgetForecast(historicalSpend, currentBudget) {
    const prompt = `Analyze spending patterns and forecast budget utilization.\n\nHistorical Spend:\n${JSON.stringify(historicalSpend)}\nCurrent Budget:\n${JSON.stringify(currentBudget)}\n\nReturn JSON: forecast, riskAreas, recommendations, savingsOpportunities.`;
    const result = await this.callGemini(prompt, 'You are a financial analyst for a Sri Lankan public university.');
    return this.parseAndValidate(result);
  }

  /**
   * Legacy compatibility: Demand forecast.
   */
  async generateDemandForecast(faculty, category, historicalData) {
    return this.forecastDemand(faculty, category, historicalData);
  }

  /**
   * Query the Flowise Chatflow.
   */
  async askFlowise(question, sessionId) {
    const env = require('../config/env');
    const url = `${env.FLOWISE_API_URL}/prediction/${env.FLOWISE_CHATFLOW_ID}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Flowise API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const text = data.text || '';
      const processingTimeMs = Date.now() - startTime;

      // Build explainability log structure
      const explainabilityLog = {
        feature: 'INTERACTIVE_AI_CHAT',
        inputText: question,
        inputData: { sessionId, chatId: data.chatId, chatMessageId: data.chatMessageId },
        model: 'Flowise - Google Gemini Agent',
        temperature: 0.7,
        promptUsed: 'System Prompt defined in Flowise Agent config.',
        scoringFormula: 'N/A (Flowise Agentic reasoning & Tool execution)',
        dataSources: ['Flowise Local Database', 'Gemini Chat Models'],
        result: text.substring(0, 500),
        outputData: { fullResponse: text },
        processingTimeMs,
        disclaimer: 'Interactive AI response from Flowise. Subject to verification.',
      };

      return {
        text,
        chatId: data.chatId,
        sessionId: data.sessionId,
        explainabilityLog,
      };
    } catch (error) {
      logger.error('Flowise prediction call failed.', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AIService();
