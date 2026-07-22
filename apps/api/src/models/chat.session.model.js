/**
 * Chat Session Model
 * Persists Flowise AI chat conversations for session resumption and audit trail.
 */
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    chatId: String,
    chatMessageId: String,
    sourceDocuments: [mongoose.Schema.Types.Mixed],
    usedTools: [String],
    processingTimeMs: Number,
  },
  rating: {
    type: Number,       // -1 = thumbs down, 0 = neutral, 1 = thumbs up
    default: 0,
  },
  ratingFeedback: String,
}, { _id: false });

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Conversation',
  },
  messages: [chatMessageSchema],
  messageCount: {
    type: Number,
    default: 0,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for efficient session lookup
chatSessionSchema.index({ userId: 1, tenantId: 1, isArchived: 1, lastActivityAt: -1 });
chatSessionSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

// Auto-generate title from first user message
chatSessionSchema.methods.generateTitle = function () {
  const firstUserMsg = this.messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const text = firstUserMsg.content.trim();
    this.title = text.length > 60 ? text.substring(0, 57) + '...' : text;
  }
  return this.title;
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);
