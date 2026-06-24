const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditStats, getUserTimeline } = require('../controllers/audit.log.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// Audit log dashboard stats
router.get('/stats',
  authorize('admin', 'vc', 'auditor', 'super_admin'),
  getAuditStats
);

// All audit logs (paginated with filters)
router.get('/',
  authorize('admin', 'vc', 'auditor', 'super_admin'),
  getAuditLogs
);

// Specific user's login/logout timeline
router.get('/user/:userId',
  authorize('admin', 'vc', 'auditor', 'super_admin'),
  getUserTimeline
);

module.exports = router;
