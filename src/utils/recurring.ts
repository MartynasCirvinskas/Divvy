import { Recurrence, RecurrenceCadence } from '../types';

const DAY_MS = 86_400_000;

function stepMs(cadence: RecurrenceCadence): number {
  switch (cadence) {
    case 'weekly':
      return 7 * DAY_MS;
    case 'biweekly':
      return 14 * DAY_MS;
    case 'monthly':
      // Approximate; calendar-aware version is V2.
      return 30 * DAY_MS;
  }
}

export function nextOccurrence(rec: Recurrence, after: number): number | null {
  const step = stepMs(rec.cadence);
  let next = rec.startAt;
  while (next <= after) next += step;
  if (rec.endAt && next > rec.endAt) return null;
  return next;
}

export function recurrenceLabel(rec: Recurrence): string {
  switch (rec.cadence) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
  }
}
