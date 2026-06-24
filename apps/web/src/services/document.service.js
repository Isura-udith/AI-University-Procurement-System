/**
 * Document Service
 * Frontend API bindings for Document Repository.
 */
import api from './api';

export const documentService = {
  /** Get documents list with filters */
  getDocuments: (params = {}) => api.get('/documents', { params }),

  /** Upload a new document file and metadata */
  uploadDocument: (formData) => api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  /** Upload a new version file for an existing document */
  updateDocument: (id, formData) => api.put(`/documents/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  /** Update document status (Draft, Approved, Signed, Locked, Active) */
  updateStatus: (id, status) => api.patch(`/documents/${id}/status`, { status }),
};

export default documentService;
