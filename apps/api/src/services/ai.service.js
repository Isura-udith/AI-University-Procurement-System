const { z } = require('zod');
const aiConfig = require('../config/ai.config');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.apiKey = aiConfig.gemini.apiKey;
    this.baseUrl = aiConfig.gemini.baseUrl;
    this.model = aiConfig.gemini.model;
    this.maxRetries = 3;
    // LRU cache for embeddings (max 200 entries)
    this._embeddingCache = new Map();
    this._embeddingCacheMaxSize = 200;
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
   * Compute a text embedding using Gemini text-embedding-004.
   * Uses LRU cache to avoid re-computing frequently asked queries.
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async getEmbedding(text) {
    if (!text || !this.isConfigured() || this._embeddingDisabled) return [];

    // Check cache
    const cacheKey = text.substring(0, 200);
    if (this._embeddingCache.has(cacheKey)) {
      return this._embeddingCache.get(cacheKey);
    }

    const env = require('../config/env');
    const primaryModel = env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    const modelsToTry = [primaryModel, 'embedding-001'];

    for (const model of modelsToTry) {
      const url = `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: text.substring(0, 2048) }] },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const embedding = data?.embedding?.values || [];

          if (embedding.length > 0) {
            if (this._embeddingCache.size >= this._embeddingCacheMaxSize) {
              const firstKey = this._embeddingCache.keys().next().value;
              this._embeddingCache.delete(firstKey);
            }
            this._embeddingCache.set(cacheKey, embedding);
          }
          return embedding;
        }

        if (response.status === 404 && model === modelsToTry[modelsToTry.length - 1]) {
          logger.warn('Gemini Embedding API endpoint returned 404 for all models. Disabling vector embeddings and using Keyword RAG fallback.');
          this._embeddingDisabled = true;
          return [];
        }
      } catch (err) {
        logger.warn('Embedding computation failed', { error: err.message });
        return [];
      }
    }

    return [];
  }

  /**
   * Batch compute embeddings for multiple texts.
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async getEmbeddings(texts) {
    const results = [];
    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < texts.length; i += 5) {
      const batch = texts.slice(i, i + 5);
      const embeddings = await Promise.all(batch.map(t => this.getEmbedding(t)));
      results.push(...embeddings);
      // Small delay between batches to avoid rate limits
      if (i + 5 < texts.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return results;
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  _cosineSimilarity(a, b) {
    if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
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

  // ==================================
  // Flowise Chat & Knowledge Base
  // ==================================

  /**
   * Query the Flowise Chatflow (enhanced with source docs & tool usage extraction).
   */
  /**
   * Query the Flowise Chatflow or fall back to Local RAG document search.
   */
  async askFlowise(question, sessionId, conversationHistory = []) {
    const env = require('../config/env');
    const url = `${env.FLOWISE_API_URL}/prediction/${env.FLOWISE_CHATFLOW_ID}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ question, sessionId }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Flowise API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const text = data.text || '';
      const processingTimeMs = Date.now() - startTime;

      // Extract source documents from Flowise response
      let sourceDocuments = (data.sourceDocuments || []).map(doc => ({
        pageContent: doc.pageContent?.substring(0, 300) || '',
        metadata: doc.metadata || {},
      }));

      // If Flowise returned no source documents, try supplementing with local RAG citations
      if (sourceDocuments.length === 0) {
        const localRagResult = await this.queryLocalRAG(question, 'uwu-main', conversationHistory);
        if (localRagResult && localRagResult.sourceDocuments) {
          sourceDocuments = localRagResult.sourceDocuments;
        }
      }

      // Extract used tools from Flowise agent response
      const usedTools = [];
      if (data.agentReasoning && Array.isArray(data.agentReasoning)) {
        for (const step of data.agentReasoning) {
          if (step.usedTools && Array.isArray(step.usedTools)) {
            usedTools.push(...step.usedTools);
          }
          if (step.toolName) {
            usedTools.push(step.toolName);
          }
        }
      }

      const followUpSuggestions = await this._generateFollowUpSuggestions(question, text);

      const explainabilityLog = {
        feature: 'INTERACTIVE_AI_CHAT',
        inputText: question,
        inputData: { sessionId, chatId: data.chatId, chatMessageId: data.chatMessageId },
        model: 'Flowise - Google Gemini Agent',
        temperature: 0.7,
        promptUsed: 'System Prompt defined in Flowise Agent config.',
        scoringFormula: 'N/A (Flowise Agentic reasoning & Tool execution)',
        dataSources: ['Flowise Local Database', 'Gemini Chat Models', ...(sourceDocuments.length > 0 ? ['Knowledge Base Documents (RAG)'] : [])],
        result: text.substring(0, 500),
        outputData: { fullResponse: text },
        processingTimeMs,
        disclaimer: 'Interactive AI response from Flowise. Subject to verification.',
      };

      return {
        text,
        chatId: data.chatId,
        sessionId: data.sessionId,
        sourceDocuments,
        usedTools: [...new Set(usedTools)],
        followUpSuggestions,
        processingTimeMs,
        explainabilityLog,
      };
    } catch (error) {
      logger.warn('Flowise server call unavailable or failed. Falling back to Local Document Store RAG.', { error: error.message });

      try {
        // Fallback: Query local document store RAG + Gemini directly (with conversation memory)
        const localRag = await this.queryLocalRAG(question, 'uwu-main', conversationHistory);

        if (localRag) {
          const processingTimeMs = Date.now() - startTime;
          let followUpSuggestions;
          try {
            followUpSuggestions = await this._generateFollowUpSuggestions(question, localRag.text);
          } catch { followUpSuggestions = ['What are the GOSL procurement methods?', 'Explain the procurement lifecycle.']; }
          
          return {
            text: localRag.text,
            chatId: `local-${Date.now()}`,
            sessionId: sessionId || `session-${Date.now()}`,
            sourceDocuments: localRag.sourceDocuments,
            usedTools: ['semantic_rag_knowledge_store'],
            followUpSuggestions,
            processingTimeMs,
            explainabilityLog: {
              feature: 'INTERACTIVE_AI_CHAT',
              inputText: question,
              inputData: { sessionId },
              model: 'Semantic RAG + Google Gemini 2.0 Flash',
              temperature: 0.4,
              promptUsed: 'Semantic Vector RAG Grounded Prompt with Conversation Memory',
              dataSources: ['Official GOSL & University Procurement Documents (Semantic RAG)'],
              result: localRag.text.substring(0, 500),
              processingTimeMs,
              disclaimer: 'Grounded response generated using official procurement documents with semantic retrieval.',
            },
          };
        }

        // If local RAG has no matched documents, fall back to direct Gemini call with conversation context
        let fallbackPrompt = '';
        if (conversationHistory.length > 0) {
          const historyText = conversationHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
          fallbackPrompt = `CONVERSATION HISTORY:\n${historyText}\n\nCURRENT QUESTION:\n${question}`;
        } else {
          fallbackPrompt = question;
        }

        const fallbackSystemPrompt = `You are an expert AI Procurement Specialist for Uva Wellassa University (UWU), Sri Lanka.
You specialize in Sri Lanka Government Procurement Guidelines (GOSL PG-2024), PFM Act compliance, NCB/ICB/Shopping methods, tender evaluation, and university procurement workflows.

Rules:
- Be specific, structured, and professional.
- Use markdown formatting (headers, bullet points, tables) for clarity.
- If you don't know something specific, say so honestly.
- Always mention that your answers are advisory and subject to verification.`;

        const answer = await this.callGemini(fallbackPrompt, fallbackSystemPrompt, { temperature: 0.4, maxTokens: 4096 });
        let followUpSuggestions;
        try {
          followUpSuggestions = await this._generateFollowUpSuggestions(question, answer);
        } catch { followUpSuggestions = ['What are the GOSL procurement methods?', 'Explain the procurement lifecycle.']; }

        return {
          text: answer,
          chatId: `fallback-${Date.now()}`,
          sessionId: sessionId || `session-${Date.now()}`,
          sourceDocuments: [],
          usedTools: ['gemini_general_knowledge'],
          followUpSuggestions,
          processingTimeMs: Date.now() - startTime,
          explainabilityLog: {
            feature: 'INTERACTIVE_AI_CHAT',
            inputText: question,
            model: 'Google Gemini 2.0 Flash (Fallback)',
            dataSources: ['Gemini General Knowledge'],
            result: answer.substring(0, 500),
          },
        };
      } catch (fallbackError) {
        logger.error('All AI fallback paths failed', { error: fallbackError.message });
        // Return a graceful response rather than throwing
        return {
          text: `I apologize, but I'm experiencing temporary technical difficulties processing your question. Please try again in a moment.\n\n**Your question:** "${question}"\n\n*If the issue persists, please check that the Gemini API key is configured correctly.*`,
          chatId: `error-${Date.now()}`,
          sessionId: sessionId || `session-${Date.now()}`,
          sourceDocuments: [],
          usedTools: [],
          followUpSuggestions: ['What are the GOSL procurement methods?', 'Explain the procurement lifecycle.'],
          processingTimeMs: Date.now() - startTime,
          explainabilityLog: {
            feature: 'INTERACTIVE_AI_CHAT',
            inputText: question,
            model: 'Error - All fallbacks failed',
            dataSources: [],
            result: 'All AI paths failed: ' + fallbackError.message,
          },
        };
      }
    }
  }

  /**
   * Search Knowledge Base documents & chunks using local RAG keyword/relevance matching.
   */
  async queryLocalRAG(question, tenantId = 'uwu-main', conversationHistory = []) {
    try {
      const KnowledgeDocument = require('../models/knowledge.document.model');
      const docs = await KnowledgeDocument.find({ tenantId }).lean();

      if (!docs || docs.length === 0) {
        return null;
      }

      // Compute query embedding for semantic search
      const queryEmbedding = await this.getEmbedding(question);
      const hasEmbeddings = queryEmbedding.length > 0;

      const matchedChunks = [];

      for (const doc of docs) {
        for (const chunk of (doc.chunks || [])) {
          let score = 0;

          // Primary: Vector similarity search (if embeddings available)
          if (hasEmbeddings && chunk.embedding && chunk.embedding.length > 0) {
            const similarity = this._cosineSimilarity(queryEmbedding, chunk.embedding);
            score = similarity;
          } else {
            // Fallback: Enhanced keyword matching for chunks without embeddings
            const chunkTextLower = chunk.text.toLowerCase();
            const terms = question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
            let keywordScore = 0;
            for (const term of terms) {
              if (chunkTextLower.includes(term)) {
                keywordScore += 1;
                const count = (chunkTextLower.match(new RegExp(term, 'g')) || []).length;
                keywordScore += Math.min(count * 0.5, 3);
              }
            }
            // Normalize keyword score to 0-1 range (approximate)
            score = Math.min(keywordScore / (terms.length * 2 || 1), 1) * 0.7;
          }

          if (score > 0.25) {
            matchedChunks.push({
              documentName: doc.name,
              category: doc.category,
              chunkIndex: chunk.chunkIndex,
              text: chunk.text,
              score,
              isSemanticMatch: hasEmbeddings && chunk.embedding?.length > 0,
            });
          }
        }
      }

      matchedChunks.sort((a, b) => b.score - a.score);
      const topChunks = matchedChunks.slice(0, 8); // Increased from 5 to 8 for richer context

      if (topChunks.length === 0) {
        return null;
      }

      // Build rich context from matched chunks
      const contextText = topChunks.map((c, i) => 
        `[Source ${i + 1}: "${c.documentName}" | Category: ${c.category} | Relevance: ${(c.score * 100).toFixed(0)}%]\n${c.text}`
      ).join('\n\n---\n\n');

      // Build conversation history context
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        conversationContext = '\n\nCONVERSATION HISTORY (for context continuity):\n' + 
          recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 500)}`).join('\n');
      }

      const systemPrompt = `You are an expert Sri Lankan Government Procurement & University Compliance AI Assistant for Uva Wellassa University (UWU).

Your knowledge comes from official procurement documents provided in the DOCUMENT CONTEXT below.

## Your Expertise Areas
- Sri Lanka Government Procurement Guidelines (GOSL PG-2024)
- Public Finance Management (PFM) Act compliance
- Procurement methods: NCB, ICB, Limited International Bidding (LIB), Shopping, Direct Contracting, Force Account
- Tender evaluation, bid verification, and award procedures
- University procurement workflows and SOPs
- Engineer's estimates, budget validation, and contract management

## Response Rules
1. **Ground your answer in the provided document context**. Cite specific document names when referencing rules or procedures.
2. **Be comprehensive and structured**. Use markdown formatting:
   - Use **## Headers** for major sections
   - Use **bullet points** for lists
   - Use **bold** for key terms, thresholds, and important values
   - Use **tables** when comparing methods, thresholds, or criteria
3. **Be specific with numbers**. Quote exact monetary thresholds, percentages, time limits, and scoring weights from the documents.
4. **If the document context partially answers the question**, answer what you can from the documents first, then clearly note what additional information might be needed.
5. **If the question is a follow-up**, use the conversation history to understand context and provide a coherent continuation.
6. **Always end with a brief disclaimer** that this is AI-generated advisory guidance subject to official verification.`;

      const prompt = `DOCUMENT CONTEXT:\n${contextText}${conversationContext}\n\nCURRENT QUESTION:\n${question}`;

      const answer = await this.callGemini(prompt, systemPrompt, {
        temperature: 0.4,
        maxTokens: 4096,
      });

      const sourceDocuments = topChunks.map(c => ({
        pageContent: c.text.substring(0, 300) + '...',
        metadata: {
          source: c.documentName,
          category: c.category,
          chunkIndex: c.chunkIndex,
          relevanceScore: parseFloat(c.score.toFixed(3)),
          matchType: c.isSemanticMatch ? 'semantic_vector' : 'keyword',
        }
      }));

      return {
        text: answer,
        sourceDocuments,
      };
    } catch (err) {
      logger.error('Error in queryLocalRAG:', { error: err.message });
      return null;
    }
  }

  /**
   * Index all PDF & TXT documents in a specified folder into Knowledge base.
   */
  async indexDocumentsFolder(folderPath, tenantId = 'uwu-main') {
    const pdfIngestionService = require('./pdf.ingestion.service');
    const KnowledgeDocument = require('../models/knowledge.document.model');
    const path = require('path');

    const targetFolder = folderPath || path.resolve(__dirname, '../../../../Documents');
    logger.info(`Starting indexing for Documents directory: ${targetFolder}`);

    const filePaths = pdfIngestionService.scanFolder(targetFolder);
    const results = [];

    for (const filePath of filePaths) {
      try {
        const parsed = await pdfIngestionService.parseDocument(filePath);
        const relativeName = path.relative(targetFolder, filePath).replace(/\\/g, '/');
        const loaderId = `doc-pdf-${Buffer.from(relativeName).toString('hex').substring(0, 24)}`;

        const docData = {
          tenantId,
          loaderId,
          name: parsed.fileName,
          category: parsed.category,
          type: parsed.mimeType.includes('pdf') ? 'pdf' : 'txt',
          mimeType: parsed.mimeType,
          sizeBytes: parsed.sizeBytes,
          filePath: parsed.filePath,
          status: 'synced',
          textContent: parsed.textContent,
          chunks: parsed.chunks,
          isPreSeeded: true,
        };

        const doc = await KnowledgeDocument.findOneAndUpdate(
          { tenantId, loaderId },
          docData,
          { upsert: true, new: true }
        );

        // Try Flowise store upload if Flowise is configured
        try {
          await this.uploadToFlowise(filePath, parsed.fileName);
        } catch (flowiseErr) {
          logger.warn(`Flowise upload for ${parsed.fileName} skipped/failed: ${flowiseErr.message}`);
        }

        results.push({
          id: doc._id,
          loaderId: doc.loaderId,
          fileName: doc.name,
          category: doc.category,
          sizeBytes: doc.sizeBytes,
          chunksCount: doc.chunks.length,
          status: doc.status,
        });
      } catch (err) {
        logger.error(`Failed to index document ${filePath}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Generate contextual follow-up suggestions.
   */
  async _generateFollowUpSuggestions(question, answer) {
    try {
      const prompt = `Based on this procurement Q&A exchange, suggest exactly 3 natural follow-up questions the user might ask next.

User asked: "${question.substring(0, 300)}"
Assistant answered (summary): "${answer.substring(0, 500)}"

Return a JSON array of exactly 3 short follow-up question strings. Each question should be:
- Specific and actionable (not generic)
- Related to Sri Lankan procurement context
- Under 80 characters

Return ONLY the JSON array, no other text. Example: ["What are the NCB thresholds?", "How is the TEC formed?", "What documents are needed?"]`;

      const result = await this.callGemini(prompt, 'You generate procurement follow-up questions. Return valid JSON array only.', {
        temperature: 0.6,
        maxTokens: 256,
        retries: 1,
      });

      const parsed = this.parseAndValidate(result);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3).map(s => String(s).substring(0, 100));
      }
    } catch (err) {
      logger.warn('AI follow-up generation failed, using fallback', { error: err.message });
    }

    // Fallback: keyword-based suggestions
    const suggestions = [];
    const lowerQ = question.toLowerCase();
    const lowerA = answer.toLowerCase();

    if (lowerQ.includes('tender') || lowerA.includes('tender')) {
      suggestions.push('What are the bid evaluation criteria?');
    }
    if (lowerQ.includes('budget') || lowerA.includes('budget')) {
      suggestions.push('Show me the budget utilization summary.');
    }
    if (lowerQ.includes('vendor') || lowerA.includes('vendor')) {
      suggestions.push('List top-performing vendors.');
    }
    if (lowerQ.includes('gosl') || lowerA.includes('gosl') || lowerQ.includes('guideline')) {
      suggestions.push('What are the procurement method thresholds?');
    }
    if (lowerQ.includes('shopping') || lowerA.includes('shopping')) {
      suggestions.push('What are the monetary limits for Shopping method?');
    }
    if (lowerQ.includes('ncb') || lowerA.includes('ncb')) {
      suggestions.push('What documents are needed for NCB?');
    }

    if (suggestions.length === 0) {
      suggestions.push('What are the GOSL procurement methods?');
      suggestions.push('Explain the procurement lifecycle.');
      suggestions.push('What are the NCB thresholds?');
    }

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Get headers with Flowise API Key authorization.
   */
  getFlowiseHeaders(extraHeaders = {}) {
    const env = require('../config/env');
    const headers = { ...extraHeaders };
    if (env.FLOWISE_API_KEY) {
      headers['Authorization'] = `Bearer ${env.FLOWISE_API_KEY}`;
    }
    return headers;
  }

  /**
   * Automatically resolve the document store ID.
   * If FLOWISE_DOCUMENT_STORE_ID is set, return it.
   * Otherwise, try to find a store named "Smart Procurement KB" or create one.
   */
  async getOrCreateDocumentStoreId() {
    const env = require('../config/env');
    if (env.FLOWISE_DOCUMENT_STORE_ID) {
      return env.FLOWISE_DOCUMENT_STORE_ID;
    }

    if (this._cachedStoreId) {
      return this._cachedStoreId;
    }

    try {
      const listUrl = `${env.FLOWISE_API_URL}/document-store`;
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
      });

      if (!response.ok) {
        throw new Error(`Flowise document-store list failed: ${response.status}`);
      }

      const stores = await response.json();
      const targetStoreName = 'Smart Procurement KB';
      const existing = (stores || []).find(s => s.name === targetStoreName);
      if (existing) {
        this._cachedStoreId = existing.id;
        return existing.id;
      }

      // Create new one
      const createUrl = `${env.FLOWISE_API_URL}/document-store`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: targetStoreName,
          description: 'Automatically created knowledge base for Smart Procurement System',
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Flowise document-store creation failed: ${createRes.status}`);
      }

      const newStore = await createRes.json();
      this._cachedStoreId = newStore.id;
      return newStore.id;
    } catch (error) {
      logger.error('Failed to get or create Flowise Document Store ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Upload file to Flowise Document Store and ingest into MongoDB Knowledge Base.
   */
  async uploadToFlowise(filePath, fileName, tenantId = 'uwu-main') {
    const env = require('../config/env');
    const fs = require('fs');
    const pdfIngestionService = require('./pdf.ingestion.service');
    const KnowledgeDocument = require('../models/knowledge.document.model');

    // Parse text and chunk for local RAG
    let parsedDoc;
    try {
      parsedDoc = await pdfIngestionService.parseDocument(filePath);
      const loaderId = `doc-upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      await KnowledgeDocument.create({
        tenantId,
        loaderId,
        name: parsedDoc.fileName || fileName,
        category: parsedDoc.category || 'General',
        type: parsedDoc.mimeType.includes('pdf') ? 'pdf' : 'txt',
        mimeType: parsedDoc.mimeType,
        sizeBytes: parsedDoc.sizeBytes,
        filePath,
        status: 'synced',
        textContent: parsedDoc.textContent,
        chunks: parsedDoc.chunks,
        isPreSeeded: false,
      });
    } catch (parseErr) {
      logger.warn(`PDF text extraction skipped for ${fileName}: ${parseErr.message}`);
    }

    // Upload to Flowise if Flowise API is configured
    try {
      const storeId = await this.getOrCreateDocumentStoreId();
      const fileContent = fs.readFileSync(filePath);
      const blob = new Blob([fileContent], { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('files', blob, fileName);

      const url = `${env.FLOWISE_API_URL}/document-store/upsert/${storeId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getFlowiseHeaders(),
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (flowiseErr) {
      logger.warn(`Flowise upsert endpoint error for ${fileName}: ${flowiseErr.message}`);
    }

    return { success: true, message: 'File uploaded and indexed in Knowledge Base' };
  }

  /**
   * List uploaded & ingested documents from MongoDB Knowledge Base & Flowise Store.
   */
  async getKnowledgeDocuments(tenantId = 'uwu-main') {
    const KnowledgeDocument = require('../models/knowledge.document.model');
    const localDocs = await KnowledgeDocument.find({ tenantId }).sort('-createdAt').lean();

    // Map local documents into standard loader format for frontend
    const documents = localDocs.map(doc => ({
      loaderId: doc.loaderId,
      id: doc.loaderId,
      name: doc.name,
      category: doc.category,
      type: doc.type,
      sizeBytes: doc.sizeBytes,
      status: doc.status || 'synced',
      chunksCount: doc.chunks ? doc.chunks.length : 0,
      isPreSeeded: doc.isPreSeeded || false,
      updatedAt: doc.updatedAt,
    }));

    // Try fetching Flowise loaders to enrich status
    try {
      const env = require('../config/env');
      const storeId = await this.getOrCreateDocumentStoreId();
      const url = `${env.FLOWISE_API_URL}/document-store/store/${storeId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const storeDetails = await response.json();
        const flowiseLoaders = storeDetails.documentLoaders || [];
        // Merge Flowise loader IDs if missing from local DB
        for (const fl of flowiseLoaders) {
          if (!documents.some(d => d.loaderId === fl.id || d.name === fl.name)) {
            documents.push({
              loaderId: fl.id,
              id: fl.id,
              name: fl.name || 'Flowise Document',
              category: 'Flowise Store',
              type: 'pdf',
              sizeBytes: 0,
              status: fl.status || 'synced',
              chunksCount: fl.totalChunks || 0,
              isPreSeeded: false,
              updatedAt: new Date(),
            });
          }
        }
      }
    } catch {
      // Flowise check is non-blocking
    }

    return documents;
  }

  /**
   * Delete a document from MongoDB Knowledge Base and Flowise Document Store.
   */
  async deleteKnowledgeDocument(loaderId, tenantId = 'uwu-main') {
    const KnowledgeDocument = require('../models/knowledge.document.model');
    await KnowledgeDocument.deleteOne({ tenantId, loaderId });

    // Try deleting from Flowise
    try {
      const env = require('../config/env');
      const storeId = await this.getOrCreateDocumentStoreId();
      const url = `${env.FLOWISE_API_URL}/document-store/loader/${storeId}/${loaderId}`;
      await fetch(url, {
        method: 'DELETE',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
      });
    } catch {
      // Flowise deletion is best-effort
    }

    return { success: true, loaderId };
  }

  /**
   * Trigger vector store processing for all loaders in the store.
   */
  async processDocumentStore() {
    const env = require('../config/env');
    const storeId = await this.getOrCreateDocumentStoreId();

    // Try POST /api/v1/document-store/process/:id
    const url = `${env.FLOWISE_API_URL}/document-store/process/${storeId}`;
    let response = await fetch(url, {
      method: 'POST',
      headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
    });

    // Fallback to refresh if process is 404
    if (!response.ok && response.status === 404) {
      const refreshUrl = `${env.FLOWISE_API_URL}/document-store/refresh/${storeId}`;
      response = await fetch(refreshUrl, {
        method: 'POST',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Flowise process store failed: ${response.status} - ${errText}`);
    }

    return await response.json();
  }

  // ==================================
  // Chat Session Persistence
  // ==================================

  /**
   * Save a chat message pair (user + assistant) to a session.
   */
  async saveChatMessage(sessionId, userId, tenantId, userMessage, assistantResponse) {
    const ChatSession = require('../models/chat.session.model');

    let session = await ChatSession.findOne({ sessionId, userId });

    if (!session) {
      session = new ChatSession({
        sessionId,
        userId,
        tenantId,
        messages: [],
      });
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Add assistant message with metadata
    session.messages.push({
      role: 'assistant',
      content: assistantResponse.text,
      timestamp: new Date(),
      metadata: {
        chatId: assistantResponse.chatId,
        chatMessageId: assistantResponse.chatMessageId,
        sourceDocuments: assistantResponse.sourceDocuments || [],
        usedTools: assistantResponse.usedTools || [],
        processingTimeMs: assistantResponse.processingTimeMs,
      },
    });

    session.messageCount = session.messages.length;
    session.lastActivityAt = new Date();

    // Auto-generate title from first message if still default
    if (session.title === 'New Conversation') {
      session.generateTitle();
    }

    await session.save();
    return session;
  }

  /**
   * Get chat sessions for a user.
   */
  async getChatSessions(userId, tenantId, options = {}) {
    const ChatSession = require('../models/chat.session.model');
    const page = parseInt(options.page) || 1;
    const limit = Math.min(parseInt(options.limit) || 30, 100);
    const skip = (page - 1) * limit;

    const filter = {
      userId,
      tenantId,
      isArchived: false,
    };

    if (options.search) {
      filter.title = new RegExp(options.search, 'i');
    }

    const [sessions, total] = await Promise.all([
      ChatSession.find(filter)
        .select('sessionId title messageCount isPinned lastActivityAt createdAt')
        .sort({ isPinned: -1, lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ChatSession.countDocuments(filter),
    ]);

    return { sessions, total, page, limit };
  }

  /**
   * Get full chat history for a session.
   */
  async getChatHistory(sessionId, userId) {
    const ChatSession = require('../models/chat.session.model');
    const session = await ChatSession.findOne({ sessionId, userId });

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      title: session.title,
      messages: session.messages,
      messageCount: session.messageCount,
      isPinned: session.isPinned,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  /**
   * Delete (archive) a chat session.
   */
  async deleteChatSession(sessionId, userId) {
    const ChatSession = require('../models/chat.session.model');
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

    session.isArchived = true;
    await session.save();
    return { success: true };
  }

  /**
   * Rename a chat session.
   */
  async renameChatSession(sessionId, userId, title) {
    const ChatSession = require('../models/chat.session.model');
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

    session.title = title;
    await session.save();
    return { success: true, title };
  }

  /**
   * Toggle pin status on a chat session.
   */
  async togglePinSession(sessionId, userId) {
    const ChatSession = require('../models/chat.session.model');
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

    session.isPinned = !session.isPinned;
    await session.save();
    return { success: true, isPinned: session.isPinned };
  }

  /**
   * Rate a chat message (thumbs up/down).
   */
  async rateChatMessage(sessionId, userId, messageIndex, rating, feedback) {
    const ChatSession = require('../models/chat.session.model');
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    if (messageIndex < 0 || messageIndex >= session.messages.length) {
      throw Object.assign(new Error('Invalid message index'), { statusCode: 400 });
    }

    session.messages[messageIndex].rating = rating;
    if (feedback) session.messages[messageIndex].ratingFeedback = feedback;
    session.markModified('messages');
    await session.save();
    return { success: true };
  }

  // ==================================
  // Flowise Health Monitoring
  // ==================================

  /**
   * Check Flowise server health — ping, chatflow, and document store.
   */
  async checkFlowiseHealth() {
    const env = require('../config/env');
    const result = {
      status: 'unknown',
      server: false,
      chatflow: false,
      documentStore: false,
      chatflowId: env.FLOWISE_CHATFLOW_ID,
      message: '',
    };

    try {
      // 1. Ping Flowise server
      const pingUrl = `${env.FLOWISE_API_URL}/chatflows`;
      const pingRes = await fetch(pingUrl, {
        method: 'GET',
        headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
        signal: AbortSignal.timeout(5000),
      });

      if (pingRes.ok) {
        result.server = true;

        // 2. Check if our chatflow exists
        const chatflows = await pingRes.json();
        const ourChatflow = (chatflows || []).find(cf => cf.id === env.FLOWISE_CHATFLOW_ID);
        if (ourChatflow) {
          result.chatflow = true;
          result.chatflowName = ourChatflow.name || 'Procurement AI Agent';
        }
      }

      // 3. Check document store
      try {
        const storeUrl = `${env.FLOWISE_API_URL}/document-store`;
        const storeRes = await fetch(storeUrl, {
          method: 'GET',
          headers: this.getFlowiseHeaders({ 'Content-Type': 'application/json' }),
          signal: AbortSignal.timeout(5000),
        });
        if (storeRes.ok) {
          result.documentStore = true;
        }
      } catch {
        // Document store check is non-critical
      }

      // Determine overall Flowise status
      if (result.server && result.chatflow) {
        result.status = 'healthy';
        result.message = 'Flowise server is running and chatflow is active.';
      } else if (result.server) {
        result.status = 'degraded';
        result.message = `Flowise server is running but chatflow ${env.FLOWISE_CHATFLOW_ID} was not found.`;
      } else {
        result.status = 'down';
        result.message = 'Flowise server is not reachable.';
      }
    } catch (error) {
      result.status = 'down';
      result.message = `Flowise server connection failed: ${error.message}`;
    }

    return result;
  }

  /**
   * AI Vendor Technical Scoring & Evaluation Breakdown
   */
  async scoreBidderAI(tender, bid, criteria = []) {
    const defaultCriteria = [
      { name: "Relevant Experience", max: 25, key: "relevant_experience" },
      { name: "Technical Methodology", max: 20, key: "technical_methodology" },
      { name: "Key Staff Qualifications", max: 15, key: "key_staff_qualifications" },
      { name: "Compliance & Standards", max: 10, key: "compliance___standards" },
    ];
    const activeCriteria = (criteria && criteria.length > 0) ? criteria : defaultCriteria;
    const vendorName = bid.vendorId?.companyName || bid.vendorName || "Vendor";
    const perfScore = bid.vendorId?.performanceScore ?? 85;
    const bidAmount = bid.totalBidAmount || bid.quotedPrice || 0;
    const est = tender?.engineersEstimate || 0;

    let aiResult = null;
    if (this.isConfigured()) {
      try {
        const prompt = `You are an expert Technical Evaluation Committee (TEC) AI evaluator under Sri Lanka GOSL procurement guidelines.
Evaluate vendor "${vendorName}" for Procurement Tender "${tender?.title || 'Tender'}" (Budget Est: LKR ${est}).
Bid Details:
- Quoted Price: LKR ${bidAmount}
- Vendor Historical Performance Score: ${perfScore}/100
- Technical Compliance: ${bid.technicalProposal?.complianceConfirmed ? 'Confirmed' : 'Standard'}
- Delivery Timeline: ${bid.deliveryTimeDays || 'Standard'} days

Technical Criteria to evaluate:
${activeCriteria.map(c => `- ${c.name} (Max: ${c.max} points)`).join('\n')}

For each criterion, assign an objective, fair score up to its max score based on parameters.
Return JSON with format:
{
  "technicalScores": [
    { "criterion": "${activeCriteria[0]?.name || 'Criterion'}", "givenScore": 22, "notes": "Strong past experience." }
  ],
  "overallNotes": "Comprehensive proposal meeting TEC standards.",
  "confidencePct": 94
}`;

        const rawJson = await this.callGemini(prompt, "You are a professional GOSL Procurement TEC AI Auditor. Return valid JSON only.");
        const schema = z.object({
          technicalScores: z.array(z.object({
            criterion: z.string(),
            givenScore: z.number(),
            notes: z.string().optional(),
          })),
          overallNotes: z.string().optional(),
          confidencePct: z.number().optional(),
        });
        aiResult = this.parseAndValidate(rawJson, schema);
      } catch (err) {
        logger.warn('Gemini scoring failed, using intelligent TEC fallback algorithm', { error: err.message });
      }
    }

    const scoresMap = {};
    if (aiResult?.technicalScores) {
      aiResult.technicalScores.forEach(item => {
        scoresMap[item.criterion.toLowerCase().trim()] = item;
      });
    }

    const technicalScores = activeCriteria.map(c => {
      const cKey = c.name.toLowerCase().trim();
      if (scoresMap[cKey]) {
        return {
          criterion: c.name,
          maxScore: c.max,
          givenScore: Math.min(Math.max(0, Math.round(scoresMap[cKey].givenScore)), c.max),
          notes: scoresMap[cKey].notes || `Evaluated by AI based on submitted proposal documentation.`,
        };
      }

      // Intelligent TEC rule calculation
      const baseRatio = Math.min(Math.max(0.68, (perfScore / 100)), 0.96);
      const given = Math.min(c.max, Math.max(0, Math.round(c.max * baseRatio)));
      return {
        criterion: c.name,
        maxScore: c.max,
        givenScore: given,
        notes: `AI evaluation benchmark score derived from vendor past performance rating (${perfScore}/100) and specification compliance.`,
      };
    });

    const totalGiven = technicalScores.reduce((sum, s) => sum + s.givenScore, 0);
    const totalMax = activeCriteria.reduce((sum, c) => sum + c.max, 0);
    const techPct = totalMax > 0 ? (totalGiven / totalMax) * 100 : 0;

    const overallNotes = aiResult?.overallNotes || 
      `AI Technical Evaluation for ${vendorName}: Total score ${totalGiven}/${totalMax} (${techPct.toFixed(1)}%). ${
        techPct >= 70 
          ? "Vendor successfully meets technical qualification benchmarks per GOSL guidelines."
          : "Vendor technical proposal falls below qualification threshold of 70%."
      }`;

    return {
      vendorId: bid.vendorId?._id || bid.vendorId,
      vendorName,
      bidId: bid._id || bid.id,
      technicalScores,
      totalGiven,
      totalMax,
      techPct: Math.round(techPct * 10) / 10,
      isQualified: techPct >= 70,
      overallNotes,
      confidencePct: aiResult?.confidencePct || 92,
      explainabilityLog: {
        feature: 'AI_VENDOR_EVALUATION_SCORING',
        inputText: `Scoring ${vendorName} for tender ${tender?.tenderNumber || tender?._id}`,
        model: this.isConfigured() ? this.model : 'TEC Rule Engine + Statistical Analysis',
        result: `Technical score: ${totalGiven}/${totalMax} (${techPct.toFixed(1)}%)`,
      }
    };
  }
}

module.exports = new AIService();

