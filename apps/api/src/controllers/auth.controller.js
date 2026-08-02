/**
 * Auth Controller
 */
const authService = require('../services/auth.service');
const { success, created, error } = require('../utils/response');

const getReqContext = (req) => ({
  ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'],
});

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body, getReqContext(req));
    res.cookie('token', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return created(res, result, 'Registration successful');
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.ip, getReqContext(req));
    res.cookie('token', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return success(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user._id);
    return success(res, user);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body, getReqContext(req));
    return success(res, user, 'Profile updated');
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword, getReqContext(req));
    return success(res, result);
  } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email, req.body.reason, getReqContext(req));
    return success(res, result, 'Password reset request submitted');
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { hashString } = require('../utils/hash');
    const token = req.params.token || req.body.token;
    if (!token) {
      throw Object.assign(new Error('Reset token is required'), { statusCode: 400 });
    }
    const hashedToken = hashString(token);
    const result = await authService.resetPassword(hashedToken, req.body.password, getReqContext(req));
    return success(res, result);
  } catch (err) { next(err); }
};

const getResetRequests = async (req, res, next) => {
  try {
    const result = await authService.getResetRequests(req.user.tenantId);
    return success(res, result);
  } catch (err) { next(err); }
};

const approveResetRequest = async (req, res, next) => {
  try {
    const result = await authService.approveResetRequest(req.params.requestId, req.body.newPassword, req.user, getReqContext(req));
    return success(res, result);
  } catch (err) { next(err); }
};

const rejectResetRequest = async (req, res, next) => {
  try {
    const result = await authService.rejectResetRequest(req.params.requestId, req.body.reason, req.user, getReqContext(req));
    return success(res, result);
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user, getReqContext(req));
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    return success(res, null, 'Logged out');
  } catch (err) {
    // Even if audit logging fails, still clear the cookie
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    return success(res, null, 'Logged out');
  }
};

const resetLock = async (req, res, next) => {
  try {
    const result = await authService.resetLock(req.body.email);
    return success(res, result);
  } catch (err) { next(err); }
};

module.exports = {
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
  resetLock,
};

