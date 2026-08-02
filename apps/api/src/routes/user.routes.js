/**
 * User Routes - RBAC-enforced for 15 roles
 *
 * All user data is stored in and validated against the database.
 * Only super_admin and admin can create/modify users.
 *
 * Endpoints:
 *   POST   /users                    — Create new user (admin only)
 *   GET    /users                    — List all users (admin + oversight)
 *   GET    /users/stats              — User statistics (admin + oversight)
 *   GET    /users/:id                — Get single user
 *   PUT    /users/:id                — Update user (admin only)
 *   DELETE /users/:id                — Deactivate user (super_admin only)
 *   PATCH  /users/:id/activate       — Re-activate user (admin only)
 *   PATCH  /users/:id/reset-password — Reset user password (admin only)
 *   POST   /users/delegate           — Delegate authority
 */
const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserStats,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  unlockUser,
  resetUserPassword,
  delegateAuthority,
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// All user routes require authentication
router.use(protect);

// ─── Create User (admin-level only) ────────────────────────────
router.post('/',
  authorize('super_admin', 'admin'),
  createUser
);

// ─── Stats (admin + oversight) ─────────────────────────────────
router.get('/stats',
  authorize('super_admin', 'admin', 'vc', 'auditor'),
  getUserStats
);

// ─── List all users (all authenticated users — needed for compose message recipient dropdown) ───
router.get('/',
  getAllUsers
);

// ─── Get single user ───────────────────────────────────────────
router.get('/:id',
  authorize('super_admin', 'admin', 'vc', 'auditor'),
  getUser
);

// ─── Update user (admin-level only) ────────────────────────────
router.put('/:id',
  authorize('super_admin', 'admin'),
  updateUser
);

// ─── Deactivate user (super_admin only) ────────────────────────
router.delete('/:id',
  authorize('super_admin'),
  deactivateUser
);

// ─── Activate user (admin-level only) ──────────────────────────
router.patch('/:id/activate',
  authorize('super_admin', 'admin'),
  activateUser
);

// ─── Unlock user account (admin-level only) ────────────────────
router.patch('/:id/unlock',
  authorize('super_admin', 'admin'),
  unlockUser
);

// ─── Reset user password (admin-level only) ────────────────────
router.patch('/:id/reset-password',
  authorize('super_admin', 'admin'),
  resetUserPassword
);

// ─── Delegate authority (VC, dean, department_head, super_admin) ──
router.post('/delegate',
  authorize('vc', 'dean', 'department_head', 'super_admin'),
  delegateAuthority
);

module.exports = router;
