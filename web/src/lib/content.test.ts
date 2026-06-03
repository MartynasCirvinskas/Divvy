import { describe, it, expect } from 'vitest';
import { sortByOrder, formatDate } from './content';

describe('sortByOrder', () => {
  it('sorts ascending by data.order', () => {
    const items = [
      { data: { order: 3 } },
      { data: { order: 1 } },
      { data: { order: 2 } },
    ];
    expect(sortByOrder(items).map((i) => i.data.order)).toEqual([1, 2, 3]);
  });
});

describe('formatDate', () => {
  it('formats a date as "Mon D, YYYY"', () => {
    expect(formatDate(new Date('2026-06-03T00:00:00Z'))).toBe('Jun 3, 2026');
  });
});
