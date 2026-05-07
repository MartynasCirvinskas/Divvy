const MAX_CENTS = 1_000_000_000_00; // $1B sanity ceiling

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function parseAmountToCents(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return NaN;
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return NaN;
  const cents = toCents(n);
  if (!Number.isFinite(cents) || cents > MAX_CENTS) return NaN;
  return cents;
}

export function splitEqualCents(totalCents: number, n: number): number[] {
  if (n <= 0) throw new Error('splitEqualCents: participant count must be > 0');
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const result = Array(n).fill(base);
  // Distribute remainder cents to the LAST `remainder` participants (deterministic)
  for (let i = n - remainder; i < n; i++) result[i] += 1;
  return result;
}

export function sumCents(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0);
}

export function formatCents(cents: number, currency = 'USD'): string {
  const amount = fromCents(cents);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
