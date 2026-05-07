export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  PLN: 'zł',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PLN', 'CHF', 'CAD', 'AUD'];

/**
 * Static reference rates relative to USD. These ship with the app as a fallback;
 * V1.5 will fetch live rates from a free public API and cache them daily.
 * Refresh periodically (quarterly is fine for split-bill use cases).
 */
export const REFERENCE_RATES_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  PLN: 4.0,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.52,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.86,
};

/**
 * Convert an amount from one currency to another using the static rate table.
 * Returns the converted cents and the rate used (so callers can persist it
 * with the expense for audit / display).
 */
export function convertCents(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string,
): { cents: number; rate: number } {
  if (fromCurrency === toCurrency) return { cents: amountCents, rate: 1 };
  const fromRate = REFERENCE_RATES_USD[fromCurrency];
  const toRate = REFERENCE_RATES_USD[toCurrency];
  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${fromCurrency} -> ${toCurrency}`);
  }
  // amount in USD = amountCents / fromRate; in toCurrency = USD * toRate
  const rate = toRate / fromRate;
  return { cents: Math.round(amountCents * rate), rate };
}

