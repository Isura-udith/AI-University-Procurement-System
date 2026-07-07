/**
 * Auth Middleware Unit Tests
 */
const { protect, authorize, requirePermission, tenantScope } = require('../src/middlewares/auth.middleware');
const { verifyToken } = require('../src/utils/jwt');
const User = require('../src/models/user.model');
const response = require('../src/utils/response');

jest.mock('../src/utils/jwt');
jest.mock('../src/models/user.model');
jest.mock('../src/utils/response');
jest.mock('../src/config/logger');

describe('Auth Middleware - protect', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();

    // Mock response helpers
    response.unauthorized.mockImplementation((res, message) => res.status(401).json({ success: false, message }));
    response.forbidden.mockImplementation((res, message) => res.status(403).json({ success: false, message }));
  });

  test('should fail if no token is provided', async () => {
    await protect(req, res, next);
    expect(response.unauthorized).toHaveBeenCalledWith(res, 'Access denied. No token provided.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should verify valid token from Authorization header and populate request context', async () => {
    req.headers.authorization = 'Bearer valid-token';
    const decoded = { id: 'user123', tenantId: 'uwu-main', faculty: 'foas' };
    verifyToken.mockReturnValue(decoded);

    const mockUserInstance = {
      _id: 'user123',
      isActive: true,
      isLocked: jest.fn().mockReturnValue(false),
      changedPasswordAfter: jest.fn().mockReturnValue(false),
      role: 'department_user',
      tenantId: 'uwu-main',
      faculty: 'foas',
      isDelegating: false
    };
    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(req.user).toBe(mockUserInstance);
    expect(req.tenantId).toBe('uwu-main');
    expect(req.faculty).toBe('foas');
    expect(next).toHaveBeenCalled();
  });

  test('should verify valid token from cookies if no header is present', async () => {
    req.cookies.token = 'cookie-token';
    const decoded = { id: 'user123', tenantId: 'uwu-main', faculty: 'foas' };
    verifyToken.mockReturnValue(decoded);

    const mockUserInstance = {
      _id: 'user123',
      isActive: true,
      isLocked: jest.fn().mockReturnValue(false),
      changedPasswordAfter: jest.fn().mockReturnValue(false),
      role: 'department_user',
      tenantId: 'uwu-main',
      faculty: 'foas',
      isDelegating: false
    };
    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('cookie-token');
    expect(next).toHaveBeenCalled();
  });

  test('should fail if token verification fails', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    verifyToken.mockImplementation(() => {
      const err = new Error('Invalid token');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    await protect(req, res, next);

    expect(response.unauthorized).toHaveBeenCalledWith(res, 'Invalid token.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail if token is expired', async () => {
    req.headers.authorization = 'Bearer expired-token';
    verifyToken.mockImplementation(() => {
      const err = new Error('Token expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    await protect(req, res, next);

    expect(response.unauthorized).toHaveBeenCalledWith(res, 'Token expired.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail if user is not found', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyToken.mockReturnValue({ id: 'nonexistent-user' });

    const mockSelect = jest.fn().mockResolvedValue(null);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(response.unauthorized).toHaveBeenCalledWith(res, 'User no longer exists.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail if user is inactive', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyToken.mockReturnValue({ id: 'user123' });

    const mockUserInstance = {
      _id: 'user123',
      isActive: false
    };
    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(response.forbidden).toHaveBeenCalledWith(res, 'Account is deactivated.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail if user is locked', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyToken.mockReturnValue({ id: 'user123' });

    const mockUserInstance = {
      _id: 'user123',
      isActive: true,
      isLocked: jest.fn().mockReturnValue(true)
    };
    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(response.forbidden).toHaveBeenCalledWith(res, 'Account is temporarily locked.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should fail if password has been changed after token was issued', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyToken.mockReturnValue({ id: 'user123', iat: 1000 });

    const mockUserInstance = {
      _id: 'user123',
      isActive: true,
      isLocked: jest.fn().mockReturnValue(false),
      changedPasswordAfter: jest.fn().mockReturnValue(true)
    };
    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(response.unauthorized).toHaveBeenCalledWith(res, 'Password recently changed. Please login again.');
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle delegation when delegate is active', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyToken.mockReturnValue({ id: 'user123' });

    const now = new Date();
    const mockUserInstance = {
      _id: 'user123',
      isActive: true,
      isLocked: jest.fn().mockReturnValue(false),
      changedPasswordAfter: jest.fn().mockReturnValue(false),
      isDelegating: true,
      delegatedTo: 'delegate123',
      delegationStart: new Date(now.getTime() - 3600 * 1000), // 1 hour ago
      delegationEnd: new Date(now.getTime() + 3600 * 1000)   // 1 hour later
    };
    const mockDelegateInstance = {
      _id: 'delegate123',
      isActive: true
    };

    const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
    User.findById.mockImplementation((id) => {
      if (id === 'user123') {
        return { select: mockSelect };
      }
      if (id === 'delegate123') {
        return Promise.resolve(mockDelegateInstance);
      }
    });

    await protect(req, res, next);

    expect(req.effectiveUser).toBe(mockDelegateInstance);
    expect(next).toHaveBeenCalled();
  });
});

describe('Auth Middleware - authorize', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();

    response.forbidden.mockImplementation((res, message) => res.status(403).json({ success: false, message }));
    response.unauthorized.mockImplementation((res, message) => res.status(401).json({ success: false, message }));
  });

  test('should fail with 401 if req.user is missing', () => {
    const middleware = authorize('admin');
    middleware(req, res, next);
    expect(response.unauthorized).toHaveBeenCalledWith(res);
    expect(next).not.toHaveBeenCalled();
  });

  test('should authorize if user role is in the list', () => {
    req.user = { role: 'admin' };
    const middleware = authorize('admin', 'super_admin');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
  });

  test('should reject with 403 if user role is not in the list', () => {
    req.user = { role: 'department_user', _id: 'user123' };
    const middleware = authorize('admin', 'super_admin');
    middleware(req, res, next);
    expect(response.forbidden).toHaveBeenCalledWith(res, "Role 'department_user' is not authorized for this action.");
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - requirePermission', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();

    response.forbidden.mockImplementation((res, message) => res.status(403).json({ success: false, message }));
    response.unauthorized.mockImplementation((res, message) => res.status(401).json({ success: false, message }));
  });

  test('should fail with 401 if req.user is missing', () => {
    const middleware = requirePermission('create_requisition');
    middleware(req, res, next);
    expect(response.unauthorized).toHaveBeenCalledWith(res);
    expect(next).not.toHaveBeenCalled();
  });

  test('should pass super_admin role without checking specific permissions', () => {
    req.user = { role: 'super_admin' };
    const middleware = requirePermission('create_requisition');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should pass if user has specific permission in their permission list', () => {
    req.user = { role: 'department_user', permissions: ['create_requisition'] };
    const middleware = requirePermission('create_requisition');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should reject with 403 if user does not have permission', () => {
    req.user = { role: 'department_user', permissions: [] };
    const middleware = requirePermission('verify_budget');
    middleware(req, res, next);
    expect(response.forbidden).toHaveBeenCalledWith(res, 'Insufficient permissions for this action.');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware - tenantScope', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
  });

  test('should set default tenantId if not provided', () => {
    tenantScope(req, res, next);
    expect(req.tenantId).toBe('uwu-main');
    expect(next).toHaveBeenCalled();
  });

  test('should set tenantId from headers if provided', () => {
    req.headers['x-tenant-id'] = 'custom-tenant';
    tenantScope(req, res, next);
    expect(req.tenantId).toBe('custom-tenant');
    expect(next).toHaveBeenCalled();
  });
});
