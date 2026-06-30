/**
 * Notification Routes — RBAC-enforced for 15 roles
 *
 * Access:
 *   - All authenticated internal roles: View own notifications
 *   - supplier: View own notifications
 *   - guest: No access (no authentication)
 */
const express = require('express');
const router = express.Router();
const { getMyNotifications, markRead, markAllRead, getUnreadCount, deleteNotification, deleteAllRead } = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

const NOTIFICATION_ROLES = [
  'super_admin', 'admin', 'vc', 'dean', 'bursar', 'finance_officer',
  'procurement_officer', 'contract_manager', 'tec_member',
  'department_head', 'department_user', 'store_manager',
  'auditor', 'supplier',
];

router.get('/', authorize(...NOTIFICATION_ROLES), getMyNotifications);
router.get('/unread-count', authorize(...NOTIFICATION_ROLES), getUnreadCount);
router.put('/read-all', authorize(...NOTIFICATION_ROLES), markAllRead);
router.put('/:id/read', authorize(...NOTIFICATION_ROLES), markRead);
router.delete('/read-all', authorize(...NOTIFICATION_ROLES), deleteAllRead);
router.delete('/:id', authorize(...NOTIFICATION_ROLES), deleteNotification);

module.exports = router;
