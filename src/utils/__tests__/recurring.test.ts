import { nextOccurrence, recurrenceLabel } from '../recurring';

describe('recurring', () => {
  const start = new Date('2026-01-01T12:00:00Z').getTime();
  const day = 86_400_000;

  describe('nextOccurrence', () => {
    it('weekly: next after exactly 1 week', () => {
      const next = nextOccurrence({ cadence: 'weekly', startAt: start }, start);
      expect(next).toBe(start + 7 * day);
    });

    it('biweekly: next after 14 days', () => {
      const next = nextOccurrence({ cadence: 'biweekly', startAt: start }, start);
      expect(next).toBe(start + 14 * day);
    });

    it('monthly: next after ~30 days (approximate)', () => {
      const next = nextOccurrence({ cadence: 'monthly', startAt: start }, start);
      expect(next).toBe(start + 30 * day);
    });

    it('returns null after endAt', () => {
      const endAt = start + 5 * day;
      const next = nextOccurrence(
        { cadence: 'weekly', startAt: start, endAt },
        start + 6 * day,
      );
      expect(next).toBeNull();
    });

    it('skips past multiple steps when far in future', () => {
      const next = nextOccurrence({ cadence: 'weekly', startAt: start }, start + 30 * day);
      expect(next).toBe(start + 35 * day); // 5th occurrence
    });
  });

  describe('recurrenceLabel', () => {
    it('formats labels for each cadence', () => {
      expect(recurrenceLabel({ cadence: 'weekly', startAt: 0 })).toBe('Weekly');
      expect(recurrenceLabel({ cadence: 'biweekly', startAt: 0 })).toBe('Every 2 weeks');
      expect(recurrenceLabel({ cadence: 'monthly', startAt: 0 })).toBe('Monthly');
    });
  });
});
