import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../utils/password.util';

describe('Password Utilities', () => {
  it('should hash a password and verify it correctly', async () => {
    const password = 'StrongPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
    
    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect passwords', async () => {
    const password = 'CorrectPassword';
    const wrongPassword = 'WrongPassword';
    const hash = await hashPassword(password);
    
    const isMatch = await comparePassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
});
