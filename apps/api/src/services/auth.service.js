/**
 * Auth Service - Authentication and user management
 */
const User = require('../models/user.model');
const { generateTokenPair } = require('../utils/jwt');
const { generateResetToken } = require('../utils/hash');
const auditLogService = require('./audit.log.service');
const logger = require('../config/logger');

class AuthService {
  async register(userData, reqContext = {}) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) throw Object.assign(new Error('Email already registered'), { statusCode: 400 });

    // Auto-assign default permissions from role if not specified
    const { ROLE_PERMISSIONS } = require('../../../../packages/types/rbac.config');
    if (!userData.permissions || userData.permissions.length === 0) {
      userData.permissions = ROLE_PERMISSIONS[userData.role || 'department_user'] || [];
    }

    const user = await User.create(userData);
    const tokens = generateTokenPair(user);
    logger.audit('USER_REGISTER', user._id, { email: user.email, role: user.role });

    // Audit: User registration
    await auditLogService.log({
      action: 'USER_REGISTERED',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      metadata: { email: user.email, role: user.role },
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(email, password, ip, reqContext = {}) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Audit: Failed login (user not found)
      await auditLogService.log({
        action: 'LOGIN_FAILED',
        userEmail: email,
        tenantId: 'uwu-main',
        ipAddress: ip || reqContext.ip,
        userAgent: reqContext.userAgent,
        status: 'failure',
        failureReason: 'User not found',
      });
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    if (user.isLocked()) {
      await auditLogService.log({
        action: 'LOGIN_FAILED',
        user,
        tenantId: user.tenantId,
        ipAddress: ip || reqContext.ip,
        userAgent: reqContext.userAgent,
        status: 'blocked',
        failureReason: 'Account locked',
      });
      throw Object.assign(new Error('Account locked. Try again later.'), { statusCode: 423 });
    }
    if (!user.isActive) {
      await auditLogService.log({
        action: 'LOGIN_FAILED',
        user,
        tenantId: user.tenantId,
        ipAddress: ip || reqContext.ip,
        userAgent: reqContext.userAgent,
        status: 'blocked',
        failureReason: 'Account deactivated',
      });
      throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      const wasLocked = user.loginAttempts >= 5;
      if (wasLocked) { user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); }
      await user.save();

      // Audit: Failed login (wrong password)
      await auditLogService.log({
        action: 'LOGIN_FAILED',
        user,
        tenantId: user.tenantId,
        ipAddress: ip || reqContext.ip,
        userAgent: reqContext.userAgent,
        status: 'failure',
        failureReason: 'Invalid password',
        metadata: { loginAttempts: user.loginAttempts },
      });

      // Audit: Account locked (if threshold reached)
      if (wasLocked) {
        await auditLogService.log({
          action: 'ACCOUNT_LOCKED',
          user,
          tenantId: user.tenantId,
          ipAddress: ip || reqContext.ip,
          userAgent: reqContext.userAgent,
          metadata: { lockUntil: user.lockUntil, loginAttempts: user.loginAttempts },
        });
      }

      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    await user.save();
    
    const tokens = generateTokenPair(user);
    logger.audit('USER_LOGIN', user._id, { email: user.email, ip });

    // Audit: Successful login
    await auditLogService.log({
      action: 'LOGIN_SUCCESS',
      user,
      tenantId: user.tenantId,
      ipAddress: ip || reqContext.ip,
      userAgent: reqContext.userAgent,
      metadata: { lastLogin: user.lastLogin },
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(user, reqContext = {}) {
    if (user) {
      await auditLogService.log({
        action: 'LOGOUT',
        user,
        tenantId: user.tenantId,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
      });
    }
    logger.audit('USER_LOGOUT', user?._id);
  }

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return this.sanitizeUser(user);
  }

  async updateProfile(userId, updates, reqContext = {}) {
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'avatar', 'department', 'faculty'];
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => { if (allowedUpdates.includes(key)) filteredUpdates[key] = updates[key]; });
    const user = await User.findByIdAndUpdate(userId, filteredUpdates, { new: true, runValidators: true });

    // Audit: Profile updated
    await auditLogService.log({
      action: 'PROFILE_UPDATED',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      metadata: { updatedFields: Object.keys(filteredUpdates) },
    });

    return this.sanitizeUser(user);
  }

  async changePassword(userId, currentPassword, newPassword, reqContext = {}) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
    user.password = newPassword;
    await user.save();
    logger.audit('PASSWORD_CHANGED', userId);

    // Audit: Password changed
    await auditLogService.log({
      action: 'PASSWORD_CHANGED',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email, reason = 'Forgot Password', reqContext = {}) {
    const user = await User.findOne({ email });
    if (!user) throw Object.assign(new Error('No user found with this email address'), { statusCode: 404 });

    const PasswordResetRequest = require('../models/passwordResetRequest.model');
    const Notification = require('../models/notification.model');

    // Create or update pending password reset request
    let resetReq = await PasswordResetRequest.findOne({ user: user._id, status: 'pending' });
    if (resetReq) {
      resetReq.requestedAt = new Date();
      resetReq.reason = reason || 'Forgot Password Request';
      await resetReq.save();
    } else {
      resetReq = await PasswordResetRequest.create({
        tenantId: user.tenantId || 'uwu-main',
        user: user._id,
        email: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        userRole: user.role,
        department: user.department || 'N/A',
        reason: reason || 'Forgot Password Request',
        status: 'pending',
      });
    }

    // Find all top-level system administrators
    const adminUsers = await User.find({ role: 'admin', isActive: true });
    
    // Dispatch in-app notification to all top-level admins
    for (const admin of adminUsers) {
      try {
        await Notification.create({
          tenantId: user.tenantId || 'uwu-main',
          recipient: admin._id,
          recipientRole: admin.role,
          recipientEmail: admin.email,
          type: 'system',
          title: '🔑 Password Reset Request',
          message: `User ${user.firstName || ''} ${user.lastName || ''} (${user.email}) requested a password reset. Please review and approve in User Management.`,
          priority: 'high',
          severity: 'warning',
          category: 'system',
          referenceType: 'user',
          referenceId: user._id,
          link: '/users?tab=reset-requests',
        });
      } catch (notifErr) {
        logger.warn('Notification to admin failed', { adminId: admin._id, error: notifErr.message });
      }
    }

    logger.audit('PASSWORD_RESET_REQUESTED_TO_ADMIN', user._id, { email: user.email });

    await auditLogService.log({
      action: 'PASSWORD_RESET_REQUESTED_TO_ADMIN',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      metadata: { requestId: resetReq._id, adminCount: adminUsers.length },
    });

    return {
      success: true,
      requestId: resetReq._id,
      message: 'Your password reset request has been submitted to top-level system administrators. An administrator will review and approve your request.',
    };
  }

  async getResetRequests(tenantId = 'uwu-main') {
    const PasswordResetRequest = require('../models/passwordResetRequest.model');
    return PasswordResetRequest.find({ tenantId }).sort('-createdAt').populate('user', 'firstName lastName email role department');
  }

  async approveResetRequest(requestId, newPassword, adminUser, reqContext = {}) {
    const PasswordResetRequest = require('../models/passwordResetRequest.model');
    const Notification = require('../models/notification.model');

    const resetReq = await PasswordResetRequest.findById(requestId);
    if (!resetReq) throw Object.assign(new Error('Password reset request not found'), { statusCode: 404 });
    if (resetReq.status !== 'pending') throw Object.assign(new Error(`Request has already been ${resetReq.status}`), { statusCode: 400 });

    const targetUser = await User.findById(resetReq.user);
    if (!targetUser) throw Object.assign(new Error('Target user account not found'), { statusCode: 404 });

    // Update target user password (pre-save hook hashes with bcrypt)
    targetUser.password = newPassword;
    targetUser.passwordResetToken = undefined;
    targetUser.passwordResetExpires = undefined;
    await targetUser.save();

    // Mark request as approved
    resetReq.status = 'approved';
    resetReq.approvedBy = adminUser._id;
    resetReq.approvedByName = `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim();
    resetReq.approvedAt = new Date();
    resetReq.temporaryPassword = newPassword;
    await resetReq.save();

    // Notify user of password approval
    try {
      await Notification.create({
        tenantId: targetUser.tenantId || 'uwu-main',
        recipient: targetUser._id,
        type: 'system',
        title: '✅ Password Reset Approved',
        message: `Your password reset request has been approved by Administrator ${adminUser.firstName} ${adminUser.lastName}. Temporary Password: ${newPassword}`,
        priority: 'high',
        severity: 'success',
        category: 'system',
        referenceType: 'user',
        referenceId: targetUser._id,
      });
    } catch (err) {
      logger.warn('Failed to send approval notification to user', { userId: targetUser._id });
    }

    logger.audit('PASSWORD_RESET_APPROVED_BY_ADMIN', targetUser._id, { approvedBy: adminUser._id });

    await auditLogService.log({
      action: 'PASSWORD_RESET_APPROVED_BY_ADMIN',
      user: adminUser,
      tenantId: adminUser.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
      metadata: { targetUserId: targetUser._id, targetEmail: targetUser.email, requestId },
    });

    return { message: 'Password reset approved and user password updated successfully', requestId, temporaryPassword: newPassword };
  }

  async rejectResetRequest(requestId, rejectionReason, adminUser, reqContext = {}) {
    const PasswordResetRequest = require('../models/passwordResetRequest.model');
    const Notification = require('../models/notification.model');

    const resetReq = await PasswordResetRequest.findById(requestId);
    if (!resetReq) throw Object.assign(new Error('Password reset request not found'), { statusCode: 404 });
    if (resetReq.status !== 'pending') throw Object.assign(new Error(`Request has already been ${resetReq.status}`), { statusCode: 400 });

    resetReq.status = 'rejected';
    resetReq.rejectedBy = adminUser._id;
    resetReq.rejectedByName = `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim();
    resetReq.rejectedAt = new Date();
    resetReq.rejectionReason = rejectionReason || 'Rejected by Administrator';
    await resetReq.save();

    // Notify user
    try {
      await Notification.create({
        tenantId: resetReq.tenantId || 'uwu-main',
        recipient: resetReq.user,
        type: 'system',
        title: '❌ Password Reset Request Declined',
        message: `Your password reset request was declined by Administrator. Reason: ${rejectionReason || 'Contact system admin'}`,
        priority: 'normal',
        severity: 'error',
        category: 'system',
      });
    } catch (err) {
      logger.warn('Failed to send rejection notification', { userId: resetReq.user });
    }

    return { message: 'Password reset request rejected' };
  }

  async resetPassword(hashedToken, newPassword, reqContext = {}) {
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    if (!user) throw Object.assign(new Error('Token is invalid or expired'), { statusCode: 400 });
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    logger.audit('PASSWORD_RESET', user._id);

    // Audit: Password reset completed
    await auditLogService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : user;
    delete obj.password;
    delete obj.mfaSecret;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    return obj;
  }
}

module.exports = new AuthService();

