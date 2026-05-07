import { convertCents, currencySymbol, SUPPORTED_CURRENCIES } from '../currency';

describe('currency', () => {
  describe('convertCents', () => {
    it('returns same amount when currencies match', () => {
      expect(convertCents(1000, 'USD', 'USD')).toEqual({ cents: 1000, rate: 1 });
    });

    it('USD → EUR rounds to nearest cent', () => {
      const { cents } = convertCents(10000, 'USD', 'EUR'); // $100 → €92
      expect(cents).toBe(9200);
    });

    it('roundtrip USD → EUR → USD is approximately equal', () => {
      const { cents: eur } = convertCents(10000, 'USD', 'EUR');
      const { cents: usd } = convertCents(eur, 'EUR', 'USD');
      expect(Math.abs(usd - 10000)).toBeLessThan(5); // < 5 cents drift
    });

    it('throws on unknown source currency', () => {
      expect(() => convertCents(100, 'XYZ', 'USD')).toThrow();
    });

    it('throws on unknown target currency', () => {
      expect(() => convertCents(100, 'USD', 'XYZ')).toThrow();
    });

    it('returns rate multiplier consumers can persist', () => {
      const { rate } = convertCents(1000, 'GBP', 'USD');
      // GBP→USD: 1/0.79 ≈ 1.266
      expect(rate).toBeCloseTo(1 / 0.79, 3);
    });
  });

  describe('currencySymbol', () => {
    it('returns canonical symbols', () => {
      expect(currencySymbol('USD')).toBe('$');
      expect(currencySymbol('EUR')).toBe('€');
      expect(currencySymbol('JPY')).toBe('¥');
      expect(currencySymbol('PLN')).toBe('zł');
    });
    it('falls back to the code itself for unknown', () => {
      expect(currencySymbol('XYZ')).toBe('XYZ');
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('does not contain the dead LTL', () => {
      expect(SUPPORTED_CURRENCIES).not.toContain('LTL');
    });
    it('contains the eight launch currencies', () => {
      expect(SUPPORTED_CURRENCIES).toEqual(
        expect.arrayContaining(['USD', 'EUR', 'GBP', 'JPY', 'PLN', 'CHF', 'CAD', 'AUD']),
      );
    });
  });
});
