/**
 * User Service
 * Full CRUD for user management — admin-only create, update, deactivate.
 * All operations validate against the database.
 */
const User = require('../models/user.model');
const { getPagination } = require('../utils/pagination');
const { ROLE_PERMISSIONS } = require('../middlewares/role.middleware');
const logger = require('../config/logger');

class UserService {
  /**
   * Create a new user (admin action).
   * Assigns default permissions based on role if none provided.
   */
  async create(userData, adminId) {
    // Check for duplicate email
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      throw Object.assign(new Error('A user with this email already exists.'), { statusCode: 400 });
    }

    // Check for duplicate employeeId if provided
    if (userData.employeeId) {
      const existingEmp = await User.findOne({ employeeId: userData.employeeId });
      if (existingEmp) {
        throw Object.assign(new Error('A user with this employee ID already exists.'), { statusCode: 400 });
      }
    }

    // Auto-assign default permissions from role if not specified
    if (!userData.permissions || userData.permissions.length === 0) {
      userData.permissions = ROLE_PERMISSIONS[userData.role] || [];
    }

    // Default values
    if (!userData.tenantId) userData.tenantId = 'uwu-main';
    if (!userData.password) userData.password = 'Change@1234'; // Force password change on first login

    const user = await User.create(userData);
    logger.audit('USER_CREATED', adminId, {
      newUserId: user._id,
      email: user.email,
      role: user.role,
    });

    return this.sanitize(user);
  }

  /**
   * Get all users with filtering, search, and pagination.
   */
  async getAll(query, tenantId) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.role) filters.role = query.role;
    if (query.department) filters.department = query.department;
    if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
    if (query.search) {
      filters.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { employeeId: { $regex: query.search, $options: 'i' } },
      ];
    }
    const [data, total] = await Promise.all([
      User.find(filters).select('-password -mfaSecret').sort(sort).skip(skip).limit(limit),
      User.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Get a single user by ID.
   */
  async getById(id) {
    const user = await User.findById(id).select('-password -mfaSecret');
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return user;
  }

  /**
   * Update user (admin action). Allows updating role, permissions, department, etc.
   */
  async update(id, updates, adminId) {
    // Prevent updating sensitive fields
    const forbidden = ['password', 'mfaSecret', 'passwordResetToken', 'passwordResetExpires'];
    forbidden.forEach(f => delete updates[f]);

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -mfaSecret');
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    logger.audit('USER_UPDATED', adminId, {
      targetUserId: id,
      updates: Object.keys(updates),
    });
    return user;
  }

  /**
   * Deactivate a user (soft delete).
   */
  async deactivate(id, adminId) {
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    logger.audit('USER_DEACTIVATED', adminId, { targetUserId: id });
    return user;
  }

  /**
   * Activate a previously deactivated user.
   */
  async activate(id, adminId) {
    const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    logger.audit('USER_ACTIVATED', adminId, { targetUserId: id });
    return user;
  }

  /**
   * Reset a user's password (admin action).
   */
  async resetUserPassword(id, newPassword, adminId) {
    const user = await User.findById(id).select('+password');
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    user.password = newPassword;
    await user.save();
    logger.audit('USER_PASSWORD_RESET_BY_ADMIN', adminId, { targetUserId: id });
    return { message: 'Password reset successfully' };
  }

  /**
   * Get user statistics (counts per role, active/inactive).
   */
  async getStats(tenantId) {
    const [roleCounts, statusCounts, total] = await Promise.all([
      User.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$isActive', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ tenantId }),
    ]);

    const byRole = {};
    roleCounts.forEach(r => { byRole[r._id] = r.count; });
    const active = statusCounts.find(s => s._id === true)?.count || 0;
    const inactive = statusCounts.find(s => s._id === false)?.count || 0;

    return { total, active, inactive, byRole };
  }

  /**
   * Delegate authority from one user to another.
   */
  async delegateAuthority(userId, delegateToId, startDate, endDate) {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    user.delegatedTo = delegateToId;
    user.delegationStart = startDate;
    user.delegationEnd = endDate;
    user.isDelegating = true;
    await user.save();
    logger.audit('AUTHORITY_DELEGATED', userId, { delegateTo: delegateToId, startDate, endDate });
    return user;
  }

  sanitize(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.mfaSecret;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    return obj;
  }
}

module.exports = new UserService();
