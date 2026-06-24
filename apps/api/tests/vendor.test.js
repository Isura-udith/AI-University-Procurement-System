const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/vendor.model');
const User = require('../src/models/user.model');
const jwt = require('../src/utils/jwt');

jest.mock('../src/models/vendor.model');
jest.mock('../src/models/user.model');

describe('Vendor API Endpoints', () => {
  let mockUserInstance;
  let mockVendorInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserInstance = {
      _id: '60c72b2f9b1d8b2d88888888',
      tenantId: 'uwu-main',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uwu.ac.lk',
      role: 'super_admin',
      permissions: ['manage_vendors'],
      department: 'Procurement Management Division',
      isActive: true,
      isEmailVerified: true,
      loginAttempts: 0,
      comparePassword: jest.fn().mockResolvedValue(true),
      changedPasswordAfter: jest.fn().mockReturnValue(false),
      isLocked: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(true),
      toObject: function () { return this; },
    };

    mockVendorInstance = {
      _id: '60c72b2f9b1d8b2d888888aa',
      tenantId: 'uwu-main',
      companyName: 'MedTech Solutions',
      registrationNumber: 'PV-12345',
      contactPerson: 'Jane Doe',
      email: 'jane@medtech.com',
      status: 'pending',
      cidaGrade: 'C1',
      performanceScore: 85,
      metrics: {
        deliveryTimeliness: 0,
        qualityRating: 0,
        priceCompetitiveness: 0,
        complianceScore: 0,
        totalContracts: 0,
        completedContracts: 0,
        totalContractValue: 0
      },
      save: jest.fn().mockResolvedValue(true),
      toObject: function () { return this; },
    };
  });

  describe('POST /api/v1/vendors/register', () => {
    it('should register a new vendor successfully (public self-service)', async () => {
      // Mock search check and create method
      Vendor.findOne.mockResolvedValue(null);
      Vendor.create.mockResolvedValue(mockVendorInstance);

      const res = await request(app)
        .post('/api/v1/vendors/register')
        .send({
          companyName: 'MedTech Solutions',
          registrationNumber: 'PV-12345',
          contactPerson: 'Jane Doe',
          email: 'jane@medtech.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('MedTech Solutions');
    });
  });

  describe('GET /api/v1/vendors', () => {
    it('should list all vendors successfully', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      // Chain mocks for: find().sort().skip().limit()
      const mockLimit = jest.fn().mockResolvedValue([mockVendorInstance]);
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      Vendor.find.mockReturnValue({ sort: mockSort });
      Vendor.countDocuments.mockResolvedValue(1);

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get('/api/v1/vendors')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].companyName).toBe('MedTech Solutions');
    });
  });

  describe('GET /api/v1/vendors/:id', () => {
    it('should retrieve a single vendor details', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      const mockPopulate = jest.fn().mockResolvedValue(mockVendorInstance);
      Vendor.findOne.mockReturnValue({ populate: mockPopulate });

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get(`/api/v1/vendors/${mockVendorInstance._id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('MedTech Solutions');
    });

    it('should return 404 if vendor not found', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      const mockPopulate = jest.fn().mockResolvedValue(null);
      Vendor.findOne.mockReturnValue({ populate: mockPopulate });

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get('/api/v1/vendors/60c72b2f9b1d8b2d88888000')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/vendors/:id/verify', () => {
    it('should verify a pending vendor', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      Vendor.findOne.mockResolvedValue(mockVendorInstance);

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .post(`/api/v1/vendors/${mockVendorInstance._id}/verify`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Verified');
    });
  });
});
