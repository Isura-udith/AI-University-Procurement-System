const request = require('supertest');
const app = require('../src/app');
const Procurement = require('../src/models/procurement.model');
const User = require('../src/models/user.model');
const Notification = require('../src/models/notification.model');
const jwt = require('../src/utils/jwt');

jest.mock('../src/models/procurement.model');
jest.mock('../src/models/user.model');
jest.mock('../src/models/notification.model');
jest.mock('../src/services/ai.service', () => ({
  analyzeSpecification: jest.fn().mockResolvedValue({ recommendedMethod: 'NCB', raw: 'mock_raw' }),
}));

describe('Procurement API Endpoints', () => {
  let mockUserInstance;
  let mockProcurementInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserInstance = {
      _id: '60c72b2f9b1d8b2d88888888',
      tenantId: 'uwu-main',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uwu.ac.lk',
      role: 'super_admin',
      permissions: ['create_requisition', 'approve_requisition'],
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

    mockProcurementInstance = {
      _id: '60c72b2f9b1d8b2d88888899',
      tenantId: 'uwu-main',
      title: 'Lab Spectrophotometers',
      totalEstimatedCost: 12500000,
      method: 'NCB',
      status: 'draft',
      stage: 1,
      faculty: 'Applied Sciences',
      department: 'Applied Sciences',
      requestedBy: mockUserInstance._id,
      revisionHistory: [],
      version: 1,
      items: [],
      aiAnalysis: {},
      save: jest.fn().mockResolvedValue(true),
      toObject: function () { return this; },
    };
  });

  describe('GET /api/v1/procurements', () => {
    it('should list all procurements successfully', async () => {
      // Mock protect middleware's User.findById
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      // Chain mocks for: find().populate().sort().skip().limit()
      const limitMock = jest.fn().mockResolvedValue([mockProcurementInstance]);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      Procurement.find.mockReturnValue({ populate: populateMock });
      Procurement.countDocuments.mockResolvedValue(1);

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get('/api/v1/procurements')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].title).toBe('Lab Spectrophotometers');
    });
  });

  describe('POST /api/v1/procurements', () => {
    it('should create a new procurement requisition', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      Procurement.create.mockResolvedValue(mockProcurementInstance);

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .post('/api/v1/procurements')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          title: 'Lab Spectrophotometers',
          totalEstimatedCost: 12500000,
          method: 'NCB',
          faculty: 'Applied Sciences',
          department: 'Applied Sciences',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Lab Spectrophotometers');
    });
  });

  describe('GET /api/v1/procurements/:id', () => {
    it('should retrieve a single procurement request by id', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      // Chained populate mocks: populate().populate().populate().populate()
      const populate4 = jest.fn().mockResolvedValue(mockProcurementInstance);
      const populate3 = jest.fn().mockReturnValue({ populate: populate4 });
      const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      Procurement.findOne.mockReturnValue({ populate: populate1 });

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get(`/api/v1/procurements/${mockProcurementInstance._id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Lab Spectrophotometers');
    });

    it('should return 404 if procurement is not found', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      const populate4 = jest.fn().mockResolvedValue(null);
      const populate3 = jest.fn().mockReturnValue({ populate: populate4 });
      const populate2 = jest.fn().mockReturnValue({ populate: populate3 });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      Procurement.findOne.mockReturnValue({ populate: populate1 });

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .get('/api/v1/procurements/60c72b2f9b1d8b2d88888000')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/procurements/:id/submit', () => {
    it('should transition procurement requisition state to submitted', async () => {
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      Procurement.findOne.mockResolvedValue(mockProcurementInstance);
      Notification.create.mockResolvedValue({});

      const tokens = jwt.generateTokenPair(mockUserInstance);

      const res = await request(app)
        .post(`/api/v1/procurements/${mockProcurementInstance._id}/submit`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/procurements/pending-approvals', () => {
    it('should retrieve pending approvals filtered by department for department_head', async () => {
      const mockHODUser = {
        ...mockUserInstance,
        _id: '60c72b2f9b1d8b2d88888811',
        role: 'department_head',
        department: 'Computer Science',
        permissions: ['approve_requisition'],
      };

      const mockSelect = jest.fn().mockResolvedValue(mockHODUser);
      User.findById.mockReturnValue({
        select: mockSelect,
      });

      // Mock find chain
      const populate2 = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            ...mockProcurementInstance,
            department: 'Computer Science',
            approvalChain: [{ stage: 'hod', status: 'pending' }],
          },
        ]),
      });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      Procurement.find.mockReturnValue({ populate: populate1 });

      const tokens = jwt.generateTokenPair(mockHODUser);

      const res = await request(app)
        .get('/api/v1/procurements/pending-approvals')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Procurement.find).toHaveBeenCalledWith(expect.objectContaining({
        department: { $regex: 'Computer Science', $options: 'i' },
        'approvalChain': expect.objectContaining({
          $elemMatch: { stage: 'hod', status: 'pending' }
        })
      }));
    });
  });
});
