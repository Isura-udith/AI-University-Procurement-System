/**
 * KnowledgeDocument Model
 * Document Store for Flowise & Local RAG Procurement Knowledge Base.
 */
const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  tokenCount: { type: Number, default: 0 },
  embedding: { type: [Number], default: [] }, // Gemini text-embedding-004 vector for semantic RAG search
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const knowledgeDocumentSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'uwu-main',
    index: true,
  },
  loaderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: [
      'GOSL Guidelines',
      'Procurement Manual',
      'Consultant Guidelines',
      'NCB Goods & Forms',
      'Pharmaceutical & Medical',
      'UWU Internal SOP',
      'General'
    ],
    default: 'General',
  },
  type: {
    type: String,
    enum: ['pdf', 'word', 'txt', 'excel', 'image', 'other'],
    default: 'pdf',
  },
  mimeType: {
    type: String,
    default: 'application/pdf',
  },
  sizeBytes: {
    type: Number,
    default: 0,
  },
  filePath: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['synced', 'pending', 'indexing', 'error'],
    default: 'pending',
  },
  textContent: {
    type: String,
    default: '',
  },
  chunks: [chunkSchema],
  isPreSeeded: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Text index on textContent and name for fast full-text keyword RAG retrieval
knowledgeDocumentSchema.index({ tenantId: 1, name: 'text', textContent: 'text' });
knowledgeDocumentSchema.index({ tenantId: 1, category: 1 });

module.exports = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
