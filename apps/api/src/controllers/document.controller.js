/**
 * Document Controller
 */
const documentService = require('../services/document.service');
const { success, created, badRequest, notFound } = require('../utils/response');

/** Helper to format file sizes in bytes to human-readable strings */
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/** Helper to categorize file extensions into frontend friendly types */
const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  return 'other';
};

const getDocuments = async (req, res, next) => {
  try {
    const result = await documentService.getDocuments(req.tenantId, req.query);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return badRequest(res, 'No file uploaded.');
    }

    const { name, category, status, relatedEntityType, relatedEntityId } = req.body;
    
    const fileType = getFileType(req.file.originalname);
    const fileSize = formatBytes(req.file.size);
    // Path relative to backend root: e.g. /uploads/17173821034-file.pdf
    const filePath = `/uploads/${req.file.filename}`;

    const documentData = {
      tenantId: req.tenantId,
      name: name || req.file.originalname,
      category: category || 'General',
      type: fileType,
      version: '1.0',
      filePath,
      size: fileSize,
      status: status || 'Draft',
      author: req.effectiveUser ? req.effectiveUser._id : req.user._id,
    };

    if (relatedEntityType && relatedEntityId) {
      documentData.relatedEntity = {
        entityType: relatedEntityType,
        entityId: relatedEntityId,
      };
    }

    const newDoc = await documentService.create(documentData);
    return created(res, newDoc, 'Document uploaded successfully.');
  } catch (err) {
    next(err);
  }
};

const updateDocumentFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return badRequest(res, 'No file uploaded for the new version.');
    }

    const doc = await documentService.getById(req.params.id);
    if (!doc) {
      return notFound(res, 'Document not found.');
    }

    const fileType = getFileType(req.file.originalname);
    const fileSize = formatBytes(req.file.size);
    const filePath = `/uploads/${req.file.filename}`;

    // Auto-calculate new version number if not provided
    let newVersionString = req.body.version;
    if (!newVersionString) {
      const currentVerNum = parseFloat(doc.version) || 1.0;
      newVersionString = (currentVerNum + 1.0).toFixed(1);
    }

    const fileData = {
      filePath,
      size: fileSize,
      version: newVersionString,
      status: req.body.status || doc.status,
    };

    const updatedDoc = await documentService.addVersion(
      req.params.id,
      fileData,
      req.effectiveUser ? req.effectiveUser._id : req.user._id
    );

    return success(res, updatedDoc, 'Document version updated successfully.');
  } catch (err) {
    next(err);
  }
};

const updateDocumentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return badRequest(res, 'Status is required.');
    }

    const doc = await documentService.getById(req.params.id);
    if (!doc) {
      return notFound(res, 'Document not found.');
    }

    const updatedDoc = await documentService.updateStatus(req.params.id, status);
    return success(res, updatedDoc, 'Document status updated successfully.');
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const doc = await documentService.getById(req.params.id);
    if (!doc) {
      return notFound(res, 'Document not found.');
    }

    const userId = req.effectiveUser ? req.effectiveUser._id : req.user._id;
    const isAuthor = String(doc.author?._id || doc.author) === String(userId);
    const isAdmin = ['super_admin', 'admin', 'procurement_officer'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return badRequest(res, 'You are not authorized to delete this document.');
    }

    await documentService.deleteDocument(req.params.id);
    return success(res, null, 'Document deleted successfully.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDocuments,
  uploadDocument,
  updateDocumentFile,
  updateDocumentStatus,
  deleteDocument,
};
