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
