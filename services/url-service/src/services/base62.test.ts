import { describe, it, expect } from 'vitest';
import { encodeBase62, decodeBase62 } from './base62';

describe('Base62 Encoder', () => {
  it('encodes 0 correctly', () => {
    expect(encodeBase62(0)).toBe('0');
  });

  it('encodes small numbers correctly', () => {
    expect(encodeBase62(1)).toBe('1');
    expect(encodeBase62(9)).toBe('9');
    expect(encodeBase62(10)).toBe('a');
    expect(encodeBase62(35)).toBe('z');
    expect(encodeBase62(36)).toBe('A');
    expect(encodeBase62(61)).toBe('Z');
  });

  it('encodes large numbers correctly', () => {
    expect(encodeBase62(62)).toBe('10');
    expect(encodeBase62(1000)).toBe('g8');
    expect(encodeBase62(999999)).toBe('Q0t');
  });

  it('round-trips encode and decode', () => {
    const values = [0, 1, 61, 62, 1000, 999999, Date.now()];
    for (const val of values) {
      expect(decodeBase62(encodeBase62(val))).toBe(val);
    }
  });
});
