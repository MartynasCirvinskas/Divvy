import { daysUntilBirthday, formatBirthday } from '../birthday';

describe('daysUntilBirthday', () => {
  it('returns 0 when birthday is today', () => {
    expect(daysUntilBirthday('05-09', new Date('2026-05-09T12:00:00Z'))).toBe(0);
  });

  it('returns 1 when birthday is tomorrow', () => {
    expect(daysUntilBirthday('05-10', new Date('2026-05-09T12:00:00Z'))).toBe(1);
  });

  it('returns 30 for a birthday 30 days out', () => {
    expect(daysUntilBirthday('06-08', new Date('2026-05-09T12:00:00Z'))).toBe(30);
  });

  it('rolls forward to next year for past birthdays', () => {
    // Today 2026-05-09; birthday 2026-04-01 already passed → use 2027-04-01
    const d = daysUntilBirthday('04-01', new Date('2026-05-09T12:00:00Z'));
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(365);
  });

  it('handles leap-day birthdays in non-leap years (rounds to Mar 1)', () => {
    // 2026 is not a leap year; 02-29 should be treated as 03-01
    expect(daysUntilBirthday('02-29', new Date('2026-02-28T12:00:00Z'))).toBe(1);
  });

  it('returns null for malformed input', () => {
    expect(daysUntilBirthday(undefined, new Date())).toBeNull();
    expect(daysUntilBirthday('', new Date())).toBeNull();
    expect(daysUntilBirthday('13-99', new Date())).toBeNull();
    expect(daysUntilBirthday('not-a-date', new Date())).toBeNull();
  });
});

describe('formatBirthday', () => {
  it('returns short month + day for valid input', () => {
    expect(formatBirthday('03-15')).toBe('Mar 15');
    expect(formatBirthday('11-30')).toBe('Nov 30');
  });

  it('returns null for malformed input', () => {
    expect(formatBirthday(undefined)).toBeNull();
    expect(formatBirthday('13-99')).toBeNull();
  });
});
