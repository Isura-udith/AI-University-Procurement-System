/**
 * Document Service
 * Frontend API bindings for Document Repository.
 */
import api from './api';

export const documentService = {
  /** Get documents list with filters */
  getDocuments: (params = {}) => api.get('/documents', { params }),

  /** Upload a new document file and metadata */
  uploadDocument: (formData) => api.post('/documents', formData),

  /** Upload a new version file for an existing document */
  updateDocument: (id, formData) => api.put(`/documents/${id}`, formData),

  /** Update document status (Draft, Approved, Signed, Locked, Active) */
  updateStatus: (id, status) => api.patch(`/documents/${id}/status`, { status }),

  /** Delete a document */
  deleteDocument: (id) => api.delete(`/documents/${id}`),
};

export default documentService;
