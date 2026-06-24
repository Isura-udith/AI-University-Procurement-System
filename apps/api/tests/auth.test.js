jest.mock('../src/models/user.model');
jest.mock('../src/services/audit.log.service', () => ({
  log: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const jwt = require('../src/utils/jwt');

describe('Authentication API Endpoints', () => {
  let mockUserInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserInstance = {
      _id: '60c72b2f9b1d8b2d88888888',
      tenantId: 'uwu-main',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uwu.ac.lk',
      password: 'hashed_password',
      role: 'super_admin',
      permissions: ['manage_users', 'view_reports'],
      department: 'Procurement Management Division',
      isActive: true,
      isEmailVerified: true,
      loginAttempts: 0,
      comparePassword: jest.fn().mockResolvedValue(true),
      changedPasswordAfter: jest.fn().mockReturnValue(false),
      isLocked: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(true),
      toObject: function () {
        return {
          _id: this._id,
          tenantId: this.tenantId,
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          role: this.role,
          permissions: this.permissions,
          department: this.department,
          isActive: this.isActive,
          isEmailVerified: this.isEmailVerified,
        };
      },
    };
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUserInstance);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@uwu.ac.lk',
          password: 'secure_password_123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@uwu.ac.lk');
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should return 400 if email is already registered', async () => {
      User.findOne.mockResolvedValue(mockUserInstance);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@uwu.ac.lk',
          password: 'secure_password_123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user and return a token pair', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findOne.mockReturnValue({
        select: mockSelect,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@uwu.ac.lk',
          password: 'secure_password_123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@uwu.ac.lk');
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid credentials', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findOne.mockReturnValue({
        select: mockSelect,
      });
      mockUserInstance.comparePassword.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@uwu.ac.lk',
          password: 'wrong_password',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should get profile details of logged in user', async () => {
      const mockFindByIdObj = {
        select: jest.fn().mockResolvedValue(mockUserInstance),
        then: function (resolve) {
          resolve(mockUserInstance);
        },
      };
      User.findById.mockReturnValue(mockFindByIdObj);

      // Generate a real token using user details
      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@uwu.ac.lk');
    });

    it('should return 401 if request is unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies and return success on logout', async () => {
      const mockFindByIdObj = {
        select: jest.fn().mockResolvedValue(mockUserInstance),
        then: function (resolve) {
          resolve(mockUserInstance);
        },
      };
      User.findById.mockReturnValue(mockFindByIdObj);

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out');
    });
  });
});
