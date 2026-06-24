/**
 * Message Routes — RBAC-enforced for 15 roles
 *
 * Access:
 *   - All internal roles: Send and receive messages
 *   - supplier: Can send/receive messages (bid clarifications, contract comms)
 *   - auditor: Read-only (can view messages but not send — blocked by readOnlyGuard)
 *   - guest: No access
 */
const express = require('express');
const router = express.Router();
const { getMessages, createMessage, markRead, getUnreadCount, deleteMessage } = require('../controllers/message.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');

router.use(protect);

// All authenticated internal roles + supplier can view messages
const READ_ROLES = [
  'super_admin', 'admin', 'vc', 'dean', 'bursar', 'finance_officer',
  'procurement_officer', 'contract_manager', 'tec_member',
  'department_head', 'department_user', 'store_manager',
  'auditor', 'supplier',
];

// Write roles (all except auditor and guest)
const WRITE_ROLES = [
  'super_admin', 'admin', 'vc', 'dean', 'bursar', 'finance_officer',
  'procurement_officer', 'contract_manager', 'tec_member',
  'department_head', 'department_user', 'store_manager', 'supplier',
];

router.get('/', authorize(...READ_ROLES), getMessages);
router.get('/unread-count', authorize(...READ_ROLES), getUnreadCount);
router.post('/', authorize(...WRITE_ROLES), readOnlyGuard, createMessage);
router.put('/:id/read', authorize(...READ_ROLES), markRead);
router.delete('/:id', authorize(...WRITE_ROLES), readOnlyGuard, deleteMessage);

module.exports = router;
