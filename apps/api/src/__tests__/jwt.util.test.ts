import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyToken, getExpiresInMs } from '../utils/jwt.util';

describe('JWT Utilities', () => {
  it('should sign and verify a token correctly', () => {
    const payload = { userId: 'user-123', employeeId: 'EMP-001' };
    const { token, jti } = signAccessToken(payload);
    
    expect(token).toBeDefined();
    expect(jti).toBeDefined();
    
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.employeeId).toBe(payload.employeeId);
    expect(decoded.jti).toBe(jti);
  });

  it('should throw error for invalid tokens', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('should correctly calculate expiration in milliseconds', () => {
    // Current default is 1h
    const ms = getExpiresInMs();
    expect(ms).toBe(3600000);
  });
});
