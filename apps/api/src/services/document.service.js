/**
 * Document Service
 * Handles CRUD operations, version control, and query filters for central repository.
 */
const Document = require('../models/document.model');
const logger = require('../config/logger');

class DocumentService {
  /** Create a new document entry */
  async create(data) {
    const document = await Document.create(data);
    return Document.findById(document._id)
      .populate('author', 'firstName lastName email role');
  }

  /** Get all documents scoped to tenant with filters */
  async getDocuments(tenantId, query = {}) {
    const filters = { tenantId };

    if (query.category && query.category !== 'All Documents') {
      filters.category = query.category;
    }

    if (query.status) {
      filters.status = query.status;
    }

    if (query.entityType && query.entityId) {
      filters['relatedEntity.entityType'] = query.entityType;
      filters['relatedEntity.entityId'] = query.entityId;
    }

    if (query.search) {
      filters.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { category: { $regex: query.search, $options: 'i' } }
      ];
    }

    const limit = Math.min(parseInt(query.limit) || 50, 100);
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Document.find(filters)
        .sort('-updatedAt')
        .skip(skip)
        .limit(limit)
        .populate('author', 'firstName lastName email role')
        .populate('versionHistory.author', 'firstName lastName email role')
        .lean(),
      Document.countDocuments(filters),
    ]);

    return { data, total, page, limit };
  }

  /** Fetch a single document by ID */
  async getById(id) {
    return Document.findById(id)
      .populate('author', 'firstName lastName email role')
      .populate('versionHistory.author', 'firstName lastName email role');
  }

  /** Add a new version of the document (Version Control) */
  async addVersion(id, fileData, authorId) {
    const doc = await Document.findById(id);
    if (!doc) throw new Error('Document not found');

    // Archive current version into history
    doc.versionHistory.push({
      version: doc.version,
      filePath: doc.filePath,
      size: doc.size,
      author: doc.author,
      updatedAt: doc.updatedAt || new Date()
    });

    // Update with new version details
    doc.version = fileData.version || (parseFloat(doc.version) + 1.0).toFixed(1);
    doc.filePath = fileData.filePath;
    doc.size = fileData.size;
    doc.author = authorId;
    if (fileData.status) doc.status = fileData.status;

    await doc.save();
    return Document.findById(doc._id)
      .populate('author', 'firstName lastName email role')
      .populate('versionHistory.author', 'firstName lastName email role');
  }

  /** Update status of a document */
  async updateStatus(id, status) {
    return Document.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('author', 'firstName lastName email role');
  }

  /** Delete document metadata */
  async deleteDocument(id) {
    return Document.findByIdAndDelete(id);
  }
}

module.exports = new DocumentService();
