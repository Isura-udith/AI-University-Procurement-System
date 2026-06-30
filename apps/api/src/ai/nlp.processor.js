const natural = require('natural');
const logger = require('../config/logger');

class NLPProcessor {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  trainClassifier() {
    // Goods
    this.classifier.addDocument('laptops computers printers electronics equipment hardware desk chairs furniture machinery vehicle', 'Goods');
    this.classifier.addDocument('paper stationery ink toner pens supplies laboratory chemicals', 'Goods');
    
    // Services
    this.classifier.addDocument('repair maintenance cleaning security catering transport travel software subscription hosting', 'Services');
    this.classifier.addDocument('training workshop development design', 'Services');
    
    // Works
    this.classifier.addDocument('construction building repair renovation painting paving plumbing electrical wiring', 'Works');
    
    // Consulting
    this.classifier.addDocument('consultancy audit legal financial advice feasibility study research', 'Consulting');

    this.classifier.train();
  }

  classifyCategory(text) {
    try {
      return this.classifier.classify(text);
    } catch (err) {
      logger.error('Error classifying text', err);
      return 'Goods'; // default fallback
    }
  }

  extractQuantityAndUnit(text) {
    const quantityPattern = /(\d+(?:\.\d+)?)\s*\b(units?|kilograms?|grams?|liters?|milliliters?|pcs?|pieces?|sets?|boxes?|packs?|meters?|kg|g|l|ml|m|cm|dozens?|tons?|tonnes?)?\b/gi;
    let match;
    const quantities = [];
    
    while ((match = quantityPattern.exec(text)) !== null) {
      quantities.push({
        quantity: parseFloat(match[1]),
        unit: this.normalizeUnit(match[2]),
        rawString: match[0]
      });
    }
    return quantities;
  }

  normalizeUnit(unit) {
    const normalized = String(unit || '').toLowerCase();
    const unitMap = {
      unit: 'units', pcs: 'pieces', piece: 'pieces',
      kg: 'kg', kilogram: 'kg', kilograms: 'kg',
      g: 'g', gram: 'g', grams: 'g',
      l: 'liters', liter: 'liters',
      ml: 'ml', milliliter: 'ml',
      set: 'sets', box: 'boxes', pack: 'packs',
      meter: 'meters', m: 'meters', cm: 'cm',
      dozen: 'dozens'
    };
    return unitMap[normalized] || normalized || 'units';
  }

  /**
   * Extract potential specifications/keywords using basic frequency analysis.
   */
  extractSpecifications(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopwords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'of', 'for', 'to', 'in', 'with', 'we', 'need', 'require', 'please', 'supply', 'delivery', 'procurement']);
    
    const filteredTokens = tokens.filter(t => t.length > 2 && !stopwords.has(t) && isNaN(t));
    
    // Get unique keywords (could be enhanced with TF-IDF if corpus was large enough)
    const specs = Array.from(new Set(filteredTokens)).slice(0, 8);
    return specs;
  }

  parseRequisition(rawText) {
    const cleanedText = String(rawText || '').replace(/\s+/g, ' ').trim();
    
    // Overall category classification
    const overallCategory = this.classifyCategory(cleanedText);
    
    // Specs extraction
    const identifiedSpecs = this.extractSpecifications(cleanedText);
    
    // Simple sentence/clause splitting for multi-item parsing
    const chunks = cleanedText.split(/(?:,|\band\b|\bwith\b)/i).map(c => c.trim()).filter(c => c.length > 5);
    
    const extractedItems = [];
    const seenDescriptions = new Set();
    
    const parseChunk = (chunk) => {
      // Find quantity in this chunk
      const qtyMatches = this.extractQuantityAndUnit(chunk);
      
      let description = chunk;
      let quantity = 1;
      let unit = 'units';
      
      if (qtyMatches.length > 0) {
        quantity = qtyMatches[0].quantity;
        unit = qtyMatches[0].unit;
        // Remove the quantity string from the description
        description = description.replace(qtyMatches[0].rawString, '').trim();
      }
      
      // Clean up description further
      description = description.replace(/^(?:of|for|in)\s+/i, '').trim();
      
      if (!description || seenDescriptions.has(description.toLowerCase())) {
        return null;
      }
      
      seenDescriptions.add(description.toLowerCase());
      
      return {
        description: description.substring(0, 150),
        category: this.classifyCategory(description),
        specifications: '',
        quantity,
        unit,
        estimatedUnitPrice: null,
        budgetCode: null,
        qualityStandards: null
      };
    };

    if (chunks.length > 0) {
      chunks.forEach(chunk => {
        const item = parseChunk(chunk);
        if (item) extractedItems.push(item);
      });
    } else {
      const item = parseChunk(cleanedText);
      if (item) extractedItems.push(item);
    }
    
    // Fallback if no items extracted
    if (extractedItems.length === 0) {
      extractedItems.push({
        description: cleanedText.substring(0, 80) || 'Requested procurement item',
        category: overallCategory,
        specifications: '',
        quantity: 1,
        unit: 'units',
        estimatedUnitPrice: null,
        budgetCode: null,
        qualityStandards: null
      });
    }

    const titleSource = extractedItems.slice(0, 2).map(item => item.description).join(' & ');
    
    return {
      items: extractedItems,
      overallCategory,
      suggestedTitle: titleSource ? `Procurement of ${titleSource}` : 'Procurement Request',
      suggestedJustification: 'Parsed via advanced NLP classification and entity extraction.',
      identifiedSpecs,
      recommendedMethod: 'Shopping',
      processingMode: 'local_nlp'
    };
  }
}

module.exports = new NLPProcessor();
