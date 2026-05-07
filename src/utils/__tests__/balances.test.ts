import { calculateBalances, simplifyDebts, generateGroupCode } from '../balances';
import type { Expense, Member } from '../../types';

const member = (id: string, name: string): Member => ({ id, name, joinedAt: 0 });

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  description: '',
  amountCents: 0,
  currency: 'USD',
  paidById: 'a',
  splitWith: ['a', 'b'],
  splitType: 'equal',
  category: 'other',
  createdAt: 0,
  settledBy: [],
  createdByDeviceId: 'a',
  ...overrides,
});

describe('balances', () => {
  const members = {
    a: member('a', 'Alice'),
    b: member('b', 'Bob'),
    c: member('c', 'Carol'),
  };

  it('equal split — A pays $10 for A,B,C', () => {
    const expenses = {
      e1: expense({ amountCents: 1000, paidById: 'a', splitWith: ['a', 'b', 'c'] }),
    };
    const { debts } = calculateBalances(expenses, members);
    const total = debts.reduce((s, d) => s + d.amountCents, 0);
    // Each non-payer owes 333 or 334 cents (sum = 667 since payer's 333 doesn't transfer)
    expect(total).toBe(667);
  });

  it('custom split sums correctly', () => {
    const expenses = {
      e1: expense({
        amountCents: 1500,
        paidById: 'a',
        splitWith: ['a', 'b', 'c'],
        splitType: 'custom',
        customAmounts: { a: 500, b: 500, c: 500 },
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    const owedToA = debts.filter((d) => d.to === 'a').reduce((s, d) => s + d.amountCents, 0);
    expect(owedToA).toBe(1000);
  });

  it('percentage split — basis points', () => {
    const expenses = {
      e1: expense({
        amountCents: 10000,
        paidById: 'a',
        splitWith: ['a', 'b'],
        splitType: 'percentage',
        customAmounts: { a: 5000, b: 5000 }, // 50% / 50%
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    expect(debts.length).toBe(1);
    expect(debts[0]).toMatchObject({ from: 'b', to: 'a', amountCents: 5000 });
  });

  it('does NOT exclude expense when partial settledBy', () => {
    // A paid $9 split A,B,C equally; B marked settled but C did not
    const expenses = {
      e1: expense({
        amountCents: 900,
        paidById: 'a',
        splitWith: ['a', 'b', 'c'],
        settledBy: ['b'],
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    const cOwes = debts.find((d) => d.from === 'c' && d.to === 'a');
    const bOwes = debts.find((d) => d.from === 'b' && d.to === 'a');
    expect(cOwes?.amountCents).toBe(300);
    expect(bOwes).toBeUndefined();
  });

  it('simplify debts collapses A→B→C into A→C', () => {
    const debts = [
      { from: 'a', to: 'b', amountCents: 500 },
      { from: 'b', to: 'c', amountCents: 500 },
    ];
    const simplified = simplifyDebts(debts);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toMatchObject({ from: 'a', to: 'c', amountCents: 500 });
  });

  it('handles empty splitWith without crashing', () => {
    const expenses = { e1: expense({ amountCents: 500, splitWith: [] }) };
    expect(() => calculateBalances(expenses, members)).not.toThrow();
  });

  it('zero-amount expenses produce no debts', () => {
    const expenses = { e1: expense({ amountCents: 0, splitWith: ['a', 'b'] }) };
    const { debts } = calculateBalances(expenses, members);
    expect(debts).toHaveLength(0);
  });

  it('member balances reflect cents totals', () => {
    const expenses = {
      e1: expense({ amountCents: 900, paidById: 'a', splitWith: ['a', 'b', 'c'] }),
    };
    const { memberBalances } = calculateBalances(expenses, members);
    const a = memberBalances.find((m) => m.memberId === 'a');
    expect(a?.totalPaidCents).toBe(900);
    expect(a?.netCents).toBeGreaterThan(0);
  });

  it('generateGroupCode returns 6 unambiguous chars', () => {
    const code = generateGroupCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // no O, 0, I, 1
  });
});
