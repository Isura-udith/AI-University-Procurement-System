/**
 * JWT Utility Unit Tests
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_access_secret_123456789_test_access_secret_123456789';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_123456789_test_refresh_secret_123456789';

const { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  verifyRefreshToken, 
  generateTokenPair 
} = require('../src/utils/jwt');

describe('JWT Utility Tests', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@uwu.ac.lk',
    role: 'procurement_officer',
    tenantId: 'uwu-main',
    faculty: 'foas',
    department: 'Computer Science',
    permissions: ['create_requisition']
  };

  test('generateToken should sign a token with payload', () => {
    const payload = { id: '123' };
    const token = generateToken(payload);
    expect(token).toBeDefined();
    
    const decoded = verifyToken(token);
    expect(decoded.id).toBe('123');
  });

  test('generateRefreshToken should sign a token with payload', () => {
    const payload = { id: '123' };
    const token = generateRefreshToken(payload);
    expect(token).toBeDefined();
    
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe('123');
  });

  test('verifyToken should throw an error for invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  test('generateTokenPair should generate both access and refresh tokens with correct payload properties', () => {
    const pair = generateTokenPair(mockUser);
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();

    const decodedAccess = verifyToken(pair.accessToken);
    expect(decodedAccess.id).toBe(mockUser._id);
    expect(decodedAccess.email).toBe(mockUser.email);
    expect(decodedAccess.role).toBe(mockUser.role);
    expect(decodedAccess.tenantId).toBe(mockUser.tenantId);
    expect(decodedAccess.faculty).toBe(mockUser.faculty);
    expect(decodedAccess.department).toBe(mockUser.department);
    expect(decodedAccess.permissions).toEqual(mockUser.permissions);

    const decodedRefresh = verifyRefreshToken(pair.refreshToken);
    expect(decodedRefresh.id).toBe(mockUser._id);
    expect(decodedRefresh.tenantId).toBe(mockUser.tenantId);
  });
});
