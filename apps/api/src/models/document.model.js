/**
 * Document Model
 * Centralized, version-controlled repository for procurement documents.
 */
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'uwu-main',
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Specifications', 'Evaluation', 'Contracts', 'Financial', 'Templates', 'General'],
    default: 'General',
  },
  type: {
    type: String,
    enum: ['pdf', 'word', 'excel', 'image', 'other'],
    required: true,
  },
  version: {
    type: String,
    default: '1.0',
  },
  filePath: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Signed', 'Locked', 'Active'],
    default: 'Draft',
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['procurement', 'tender', 'contract', 'payment'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  versionHistory: [{
    version: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for fast lookup
documentSchema.index({ tenantId: 1, category: 1 });
documentSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });
documentSchema.index({ tenantId: 1, name: 'text' });

module.exports = mongoose.model('Document', documentSchema);
