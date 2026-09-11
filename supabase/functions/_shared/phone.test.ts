import { describe, expect, it } from 'vitest';
import { normalizeIndonesianPhone } from './phone';

describe('normalizeIndonesianPhone', () => {
  it.each([
    ['0812 3456 7890', '+6281234567890'],
    ['62812-3456-7890', '+6281234567890'],
    ['+62 (812) 3456.7890', '+6281234567890'],
  ])('normalizes %s to one Indonesian E.164 claim', (input, expected) => {
    expect(normalizeIndonesianPhone(input)).toBe(expected);
  });

  it.each(['', '+1 202 555 0123', '0215551234', '6280', 'text', '+6281234567890123'])(
    'rejects invalid or non-mobile number %s', input => {
      expect(() => normalizeIndonesianPhone(input)).toThrow('Nomor WhatsApp Indonesia tidak valid.');
    },
  );
});
