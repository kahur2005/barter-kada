import { describe, expect, it } from 'vitest';
import { formatRupiah } from './money';

describe('rupiah display retains integer precision', () => {
  it.each([
    ['0', 'Rp0'], ['100000', 'Rp100.000'],
    ['9007199254740993', 'Rp9.007.199.254.740.993'],
  ])('formats %s without rounding', (input, output) => {
    expect(formatRupiah(input)).toBe(output);
  });
  it.each(['-1', '1.5', '', '1e3', '100.000', 'NaN'])('rejects invalid amount %s', input => {
    expect(() => formatRupiah(input)).toThrow();
  });
});
