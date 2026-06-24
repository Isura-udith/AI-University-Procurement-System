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

  async forgotPassword(email, reqContext = {}) {
    const user = await User.findOne({ email });
    if (!user) throw Object.assign(new Error('No user found with this email'), { statusCode: 404 });
    const { token, hashedToken } = generateResetToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();
    logger.audit('PASSWORD_RESET_REQUESTED', user._id, { email });

    // Audit: Password reset requested
    await auditLogService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      user,
      tenantId: user.tenantId,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent,
    });

    return { resetToken: token, message: 'Password reset token generated' };
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

