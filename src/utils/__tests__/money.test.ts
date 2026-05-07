import {
  toCents,
  fromCents,
  formatCents,
  splitEqualCents,
  sumCents,
  parseAmountToCents,
} from '../money';

describe('money', () => {
  describe('toCents / fromCents', () => {
    it('converts dollars to cents losslessly', () => {
      expect(toCents(10.05)).toBe(1005);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0)).toBe(0);
      expect(toCents(123.456)).toBe(12346);
    });
    it('converts back', () => {
      expect(fromCents(1005)).toBeCloseTo(10.05, 2);
      expect(fromCents(0)).toBe(0);
    });
    it('returns NaN for non-finite input', () => {
      expect(toCents(Infinity)).toBeNaN();
      expect(toCents(NaN)).toBeNaN();
    });
  });

  describe('parseAmountToCents', () => {
    it('parses comma decimal', () => {
      expect(parseAmountToCents('10,50')).toBe(1050);
    });
    it('parses dot decimal', () => {
      expect(parseAmountToCents('10.50')).toBe(1050);
    });
    it('rejects garbage with NaN', () => {
      expect(parseAmountToCents('abc')).toBeNaN();
    });
    it('rejects empty', () => {
      expect(parseAmountToCents('')).toBeNaN();
    });
    it('rejects negatives', () => {
      expect(parseAmountToCents('-5')).toBeNaN();
    });
    it('caps absurd inputs', () => {
      expect(parseAmountToCents('1e308')).toBeNaN();
    });
    it('accepts integer-only input', () => {
      expect(parseAmountToCents('25')).toBe(2500);
    });
    it('accepts trailing-decimal input', () => {
      expect(parseAmountToCents('25.')).toBe(2500);
    });
  });

  describe('splitEqualCents', () => {
    it('splits evenly when divisible', () => {
      expect(splitEqualCents(900, 3)).toEqual([300, 300, 300]);
    });
    it('distributes remainder to LAST N participants', () => {
      // 1000 / 3 = 333r1, expected [333, 333, 334]
      expect(splitEqualCents(1000, 3)).toEqual([333, 333, 334]);
    });
    it('handles single participant', () => {
      expect(splitEqualCents(1500, 1)).toEqual([1500]);
    });
    it('handles zero amount', () => {
      expect(splitEqualCents(0, 4)).toEqual([0, 0, 0, 0]);
    });
    it('throws on zero participants', () => {
      expect(() => splitEqualCents(100, 0)).toThrow();
    });
    it('always sums to total (property)', () => {
      const cases: [number, number][] = [
        [1000, 3],
        [1, 7],
        [9999, 11],
        [10001, 4],
      ];
      for (const [total, n] of cases) {
        const split = splitEqualCents(total, n);
        expect(sumCents(split)).toBe(total);
      }
    });
  });

  describe('formatCents', () => {
    it('formats USD', () => {
      expect(formatCents(1050, 'USD')).toBe('$10.50');
    });
    it('formats EUR with currency symbol and digits', () => {
      const out = formatCents(1050, 'EUR');
      expect(out).toMatch(/10[.,]50/);
      expect(out).toMatch(/€/);
    });
    it('falls back gracefully for unknown currency code', () => {
      const out = formatCents(1050, 'XYZ');
      expect(out).toContain('10.50');
    });
  });
});
