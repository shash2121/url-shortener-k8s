import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signAccessToken, verifyAccessToken } from './jwt';

const TEST_SECRET = 'test-secret';
const TEST_EXPIRES = '1h';

describe('JWT Sign/Verify', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpires = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRES_IN = TEST_EXPIRES;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpires;
  });

  it('signs and verifies a valid token', () => {
    const token = signAccessToken('user-123', 'test@example.com', 'user');
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('user');
  });

  it('rejects invalid tokens', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow();
  });

  it('rejects tampered tokens', () => {
    const token = signAccessToken('user-123', 'test@example.com', 'user');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
