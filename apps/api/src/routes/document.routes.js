/**
 * Document Routes — RBAC-enforced for 15 roles
 *
 * Access:
 *   - All internal roles: Read documents
 *   - supplier: Read own documents only
 *   - auditor: Read-only (blocked from writes by readOnlyGuard)
 *   - guest: No access
 *   - Uploading/editing: roles that participate in procurement workflows
 *   - Status changes: admin-level roles only
 */
const express = require('express');
const router = express.Router();
const { getDocuments, uploadDocument, updateDocumentFile, updateDocumentStatus } = require('../controllers/document.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');
const { upload } = require('../integrations/file.storage');

router.use(protect);

// Read documents (all internal roles + supplier for own docs)
router.get('/',
  authorize(
    'super_admin', 'admin', 'vc', 'dean', 'bursar', 'finance_officer',
    'procurement_officer', 'contract_manager', 'tec_member',
    'department_head', 'department_user', 'store_manager',
    'auditor', 'supplier'
  ),
  getDocuments
);

// Upload document (roles that create/manage procurement artifacts)
router.post('/',
  authorize(
    'super_admin', 'admin', 'procurement_officer', 'contract_manager',
    'department_user', 'department_head', 'dean', 'finance_officer',
    'bursar', 'store_manager', 'supplier', 'tec_member', 'vc'
  ),
  readOnlyGuard,
  upload.single('file'),
  uploadDocument
);

// Update document file (owner or admin roles)
router.put('/:id',
  authorize(
    'super_admin', 'admin', 'procurement_officer', 'contract_manager',
    'department_user', 'department_head', 'dean', 'finance_officer',
    'bursar', 'store_manager', 'supplier', 'tec_member', 'vc'
  ),
  readOnlyGuard,
  upload.single('file'),
  updateDocumentFile
);

// Change document status (admin-level roles)
router.patch('/:id/status',
  authorize('super_admin', 'admin', 'procurement_officer'),
  updateDocumentStatus
);

module.exports = router;
