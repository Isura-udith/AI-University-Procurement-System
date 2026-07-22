const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const logger = require('../config/logger');

class PDFIngestionService {
  /**
   * Parse a single PDF file and extract text & text chunks.
   * @param {string} filePath - Absolute path to PDF or TXT file
   * @returns {Promise<object>} Parsed document details and chunks
   */
  async parseDocument(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);

    let textContent = '';
    let mimeType = 'application/pdf';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      try {
        const pdfModule = require('pdf-parse');
        const PDFParseClass = pdfModule.PDFParse || (typeof pdfModule === 'function' ? pdfModule : null);

        if (PDFParseClass && PDFParseClass.prototype && PDFParseClass.prototype.getText) {
          const uint8 = new Uint8Array(dataBuffer);
          const parser = new PDFParseClass(uint8);
          const result = await parser.getText();
          if (typeof result === 'string') {
            textContent = result;
          } else if (result && Array.isArray(result.pages)) {
            textContent = result.pages.map(p => p.text || '').join('\n\n');
          } else if (result && result.text) {
            textContent = result.text;
          }
        } else if (typeof pdfModule === 'function') {
          const parsed = await pdfModule(dataBuffer);
          textContent = parsed.text || '';
        } else {
          throw new Error('No valid PDF parser found in pdf-parse package');
        }
      } catch (err) {
        logger.error(`Error parsing PDF ${fileName}:`, { error: err.message });
        throw new Error(`Failed to parse PDF file ${fileName}: ${err.message}`);
      }
    } else if (ext === '.txt' || ext === '.md') {
      textContent = fs.readFileSync(filePath, 'utf8');
      mimeType = 'text/plain';
    } else {
      throw new Error(`Unsupported document extension: ${ext}`);
    }

    // Clean text
    const cleanedText = this.cleanText(textContent);

    // Chunk text for RAG retrieval (larger chunks for better context)
    const chunks = this.chunkText(cleanedText, 1500, 300);

    // Compute embeddings for each chunk (for semantic RAG search)
    await this.embedChunks(chunks, fileName);

    // Determine category from filename
    const category = this.categorizeDocument(fileName);

    return {
      fileName,
      category,
      mimeType,
      sizeBytes: stats.size,
      filePath,
      textContent: cleanedText,
      chunks,
    };
  }

  /**
   * Clean text extracted from PDF
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\u0000/g, '') // remove null bytes
      .replace(/[ \t]+/g, ' ') // collapse horizontal whitespace
      .replace(/\n{3,}/g, '\n\n') // collapse excessive newlines
      .trim();
  }

  /**
   * Chunk text into overlapping passages
   */
  chunkText(text, chunkSize = 1000, chunkOverlap = 200) {
    if (!text) return [];
    
    const chunks = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + chunkSize, text.length);

      // Try to break at a paragraph or sentence boundary near the end index
      if (endIndex < text.length) {
        const lastPara = text.lastIndexOf('\n\n', endIndex);
        const lastSentence = text.lastIndexOf('. ', endIndex);
        if (lastPara > startIndex + chunkSize / 2) {
          endIndex = lastPara + 2;
        } else if (lastSentence > startIndex + chunkSize / 2) {
          endIndex = lastSentence + 2;
        }
      }

      const chunkText = text.substring(startIndex, endIndex).trim();
      if (chunkText.length > 20) { // Ignore tiny artifacts
        chunks.push({
          chunkIndex,
          text: chunkText,
          tokenCount: Math.ceil(chunkText.length / 4),
          metadata: { startIndex, endIndex }
        });
        chunkIndex++;
      }

      startIndex += (chunkSize - chunkOverlap);
    }

    return chunks;
  }

  /**
   * Compute Gemini embeddings for all chunks.
   * This enables semantic vector search in queryLocalRAG.
   * @param {Array} chunks - Array of chunk objects to embed
   * @param {string} fileName - Document name for logging
   */
  async embedChunks(chunks, fileName = '') {
    try {
      const aiService = require('./ai.service');
      if (!aiService.isConfigured()) {
        logger.warn(`Skipping embedding computation for ${fileName}: Gemini API not configured`);
        return;
      }

      logger.info(`Computing embeddings for ${chunks.length} chunks from ${fileName}...`);
      const startTime = Date.now();
      let embeddedCount = 0;

      // Process in batches of 5 to respect rate limits
      for (let i = 0; i < chunks.length; i += 5) {
        const batch = chunks.slice(i, i + 5);
        const texts = batch.map(c => c.text);
        const embeddings = await aiService.getEmbeddings(texts);

        for (let j = 0; j < batch.length; j++) {
          if (embeddings[j] && embeddings[j].length > 0) {
            batch[j].embedding = embeddings[j];
            embeddedCount++;
          }
        }

        // Small delay between batches
        if (i + 5 < chunks.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`✅ Embedded ${embeddedCount}/${chunks.length} chunks from ${fileName} in ${elapsed}s`);
    } catch (err) {
      logger.warn(`Embedding computation failed for ${fileName}: ${err.message}`);
      // Non-fatal: chunks without embeddings will fall back to keyword search
    }
  }

  /**
   * Determine document category based on filename
   */
  categorizeDocument(fileName) {
    const lower = fileName.toLowerCase();
    if (lower.includes('consultant')) return 'Consultant Guidelines';
    if (lower.includes('pharmaceutical') || lower.includes('medical')) return 'Pharmaceutical & Medical';
    if (lower.includes('ncb') || lower.includes('goods_ncb')) return 'NCB Goods & Forms';
    if (lower.includes('procurement_guideline') || lower.includes('government(2024)') || lower.includes('2006')) return 'GOSL Guidelines';
    if (lower.includes('manual') || lower.includes('procument manual')) return 'Procurement Manual';
    if (lower.includes('sop') || lower.includes('uwu')) return 'UWU Internal SOP';
    return 'General';
  }

  /**
   * Recursively scan a folder for PDF and TXT documents.
   */
  scanFolder(folderPath) {
    if (!fs.existsSync(folderPath)) return [];
    
    let results = [];
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(this.scanFolder(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.pdf', '.txt', '.md'].includes(ext)) {
          results.push(fullPath);
        }
      }
    }

    return results;
  }
}

module.exports = new PDFIngestionService();
