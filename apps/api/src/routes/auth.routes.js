const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getResetRequests,
  approveResetRequest,
  rejectResetRequest,
  logout,
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Admin-only Password Reset Requests Management
router.get('/reset-requests', protect, authorize('admin'), getResetRequests);
router.post('/reset-requests/:requestId/approve', protect, authorize('admin'), approveResetRequest);
router.post('/reset-requests/:requestId/reject', protect, authorize('admin'), rejectResetRequest);

module.exports = router;

