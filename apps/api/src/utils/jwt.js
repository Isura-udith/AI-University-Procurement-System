/**
 * JWT Utility - Token generation and verification
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    faculty: user.faculty || null,
    department: user.department,
    permissions: user.permissions,
  };
  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken({ id: user._id, tenantId: user.tenantId }),
  };
};

module.exports = { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken, generateTokenPair };
