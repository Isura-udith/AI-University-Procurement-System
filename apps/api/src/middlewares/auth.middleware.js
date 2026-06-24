/**
 * Auth Middleware - JWT verification, multi-tenant scoping, and delegation handling
 */
const { verifyToken } = require('../utils/jwt');
const User = require('../models/user.model');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../config/logger');
const { ROLE_PERMISSIONS, ROLES } = require('../../../../packages/types/rbac.config');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) return unauthorized(res, 'Access denied. No token provided.');

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('+password');
    if (!user) return unauthorized(res, 'User no longer exists.');
    if (!user.isActive) return forbidden(res, 'Account is deactivated.');
    if (user.isLocked()) return forbidden(res, 'Account is temporarily locked.');
    if (user.changedPasswordAfter(decoded.iat)) return unauthorized(res, 'Password recently changed. Please login again.');

    // Set tenant context
    req.user = user;
    req.tenantId = decoded.tenantId || user.tenantId;
    req.faculty = decoded.faculty || user.faculty || null;
    
    // Handle delegation
    if (user.isDelegating && user.delegatedTo) {
      const delegate = await User.findById(user.delegatedTo);
      if (delegate && user.delegationStart <= new Date() && user.delegationEnd >= new Date()) {
        req.effectiveUser = delegate;
      }
    }

    logger.debug('Auth verified', { userId: user._id, role: user.role, tenantId: req.tenantId, faculty: req.faculty, ip: req.ip });
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return unauthorized(res, 'Invalid token.');
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired.');
    return unauthorized(res, 'Authentication failed.');
  }
};

// Role-based access (RBAC)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) {
    logger.warn('Access denied', { userId: req.user._id, role: req.user.role, requiredRoles: roles, ip: req.ip });
    return forbidden(res, `Role '${req.user.role}' is not authorized for this action.`);
  }
  next();
};

// Permission-based access (PBAC)
// Checks user-specific permissions first, then falls back to the
// role's default permissions from the shared RBAC config.
const requirePermission = (...permissions) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

  // Merge user-specific permissions with role defaults
  const userPerms = req.user.permissions || [];
  const rolePerms = ROLE_PERMISSIONS[req.user.role] || [];
  const effectivePerms = [...new Set([...userPerms, ...rolePerms])];

  const hasPermission = permissions.some(p => effectivePerms.includes(p));
  if (!hasPermission) {
    return forbidden(res, 'Insufficient permissions for this action.');
  }
  next();
};

// Multi-tenant scope middleware
const tenantScope = (req, res, next) => {
  if (!req.tenantId) {
    req.tenantId = req.headers['x-tenant-id'] || 'uwu-main';
  }
  next();
};

module.exports = { protect, authorize, requirePermission, tenantScope };
