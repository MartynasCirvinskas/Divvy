import { expensesToCsv } from '../csv';
import type { Expense, Member } from '../../types';

const e = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  description: '',
  amountCents: 0,
  currency: 'USD',
  paidById: 'a',
  splitWith: ['a', 'b'],
  splitType: 'equal',
  category: 'other',
  createdAt: new Date('2026-05-01').getTime(),
  settledBy: [],
  createdByDeviceId: 'a',
  ...overrides,
});

describe('csv', () => {
  const members: Record<string, Member> = {
    a: { id: 'a', name: 'Alice', joinedAt: 0 },
    b: { id: 'b', name: 'Bob, Jr.', joinedAt: 0 }, // contains a comma
  };

  it('emits headers + one row', () => {
    const csv = expensesToCsv(
      [e({ description: 'Dinner "with friends"', amountCents: 1500 })],
      members,
      'USD',
    );
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Date,Description');
    expect(lines[0]).toContain('Settled by');
  });

  it('quotes fields containing quotes', () => {
    const csv = expensesToCsv(
      [e({ description: 'Dinner "with friends"', amountCents: 1500 })],
      members,
      'USD',
    );
    expect(csv).toContain('"Dinner ""with friends"""');
  });

  it('quotes fields containing commas', () => {
    const csv = expensesToCsv([e({ amountCents: 1500, splitWith: ['a', 'b'] })], members, 'USD');
    // The whole 'split with' field is quoted because Bob's name contains a comma
    expect(csv).toContain('"Alice; Bob, Jr."');
  });

  it('emits original-currency columns when present', () => {
    const csv = expensesToCsv(
      [
        e({
          amountCents: 9200,
          currency: 'EUR',
          originalAmountCents: 10000,
          originalCurrency: 'USD',
        }),
      ],
      members,
      'EUR',
    );
    const lines = csv.split('\n');
    expect(lines[1]).toContain('92.00'); // amount
    expect(lines[1]).toContain('EUR');
    expect(lines[1]).toContain('100.00'); // original amount
    expect(lines[1]).toContain('USD'); // original currency
  });

  it('handles empty expense list (header only)', () => {
    const csv = expensesToCsv([], members, 'USD');
    expect(csv.split('\n')).toHaveLength(1);
  });
});
