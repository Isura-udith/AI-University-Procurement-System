/**
 * User Controller
 * Admin endpoints for managing all 15 user roles.
 * All data is validated against and persisted to the database.
 */
const userService = require('../services/user.service');
const { success, created, paginated, badRequest } = require('../utils/response');

/**
 * POST /users — Create a new user (admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, password, role,
      employeeId, department, faculty, phone, permissions,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return badRequest(res, 'firstName, lastName, email, and role are required.');
    }

    const user = await userService.create(
      { firstName, lastName, email, password, role, employeeId, department, faculty, phone, permissions, tenantId: req.tenantId },
      req.user._id
    );
    return created(res, user, 'User created successfully');
  } catch (err) { next(err); }
};

/**
 * GET /users — List all users with search/filter/pagination
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await userService.getAll(req.query, req.tenantId);
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};

/**
 * GET /users/stats — User statistics (role counts, active/inactive)
 */
const getUserStats = async (req, res, next) => {
  try {
    const stats = await userService.getStats(req.tenantId);
    return success(res, stats);
  } catch (err) { next(err); }
};

/**
 * GET /users/:id — Get a single user
 */
const getUser = async (req, res, next) => {
  try {
    return success(res, await userService.getById(req.params.id));
  } catch (err) { next(err); }
};

/**
 * PUT /users/:id — Update user
 */
const updateUser = async (req, res, next) => {
  try {
    return success(res, await userService.update(req.params.id, req.body, req.user._id), 'User updated');
  } catch (err) { next(err); }
};

/**
 * DELETE /users/:id — Deactivate user (soft delete)
 */
const deactivateUser = async (req, res, next) => {
  try {
    return success(res, await userService.deactivate(req.params.id, req.user._id), 'User deactivated');
  } catch (err) { next(err); }
};

/**
 * PATCH /users/:id/activate — Re-activate a deactivated user
 */
const activateUser = async (req, res, next) => {
  try {
    return success(res, await userService.activate(req.params.id, req.user._id), 'User activated');
  } catch (err) { next(err); }
};

/**
 * PATCH /users/:id/reset-password — Reset user password (admin)
 */
const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return badRequest(res, 'newPassword is required and must be at least 8 characters.');
    }
    const result = await userService.resetUserPassword(req.params.id, newPassword, req.user._id);
    return success(res, result);
  } catch (err) { next(err); }
};

/**
 * POST /users/delegate — Delegate authority
 */
const delegateAuthority = async (req, res, next) => {
  try {
    return success(
      res,
      await userService.delegateAuthority(req.user._id, req.body.delegateToId, req.body.startDate, req.body.endDate),
      'Authority delegated'
    );
  } catch (err) { next(err); }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserStats,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  delegateAuthority,
};
