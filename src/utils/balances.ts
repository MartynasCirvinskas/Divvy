import { Expense, Member, Debt, MemberBalance } from '../types';
import { splitEqualCents } from './money';

/** Returns per-debtor cents owed for one expense (excludes settled debtors). */
function expenseDebts(expense: Expense): Debt[] {
  const debts: Debt[] = [];
  const {
    paidById,
    splitWith,
    amountCents,
    splitType,
    customAmounts,
    settledBy = [],
  } = expense;
  if (splitWith.length === 0 || amountCents <= 0) return debts;

  const settledSet = new Set(settledBy);
  let shares: Record<string, number> = {};

  if (splitType === 'equal') {
    const parts = splitEqualCents(amountCents, splitWith.length);
    splitWith.forEach((id, i) => {
      shares[id] = parts[i];
    });
  } else if (splitType === 'custom' && customAmounts) {
    shares = { ...customAmounts };
  } else if (splitType === 'percentage' && customAmounts) {
    // customAmounts is basis points (10000 = 100%)
    for (const [id, bp] of Object.entries(customAmounts)) {
      shares[id] = Math.round((amountCents * bp) / 10000);
    }
  }

  for (const [memberId, owed] of Object.entries(shares)) {
    if (memberId === paidById) continue;
    if (settledSet.has(memberId)) continue; // per-debtor settlement, NOT all-or-nothing
    if (owed <= 0) continue;
    debts.push({ from: memberId, to: paidById, amountCents: owed });
  }
  return debts;
}

export function simplifyDebts(debts: Debt[]): Debt[] {
  const net: Record<string, number> = {};
  for (const { from, to, amountCents } of debts) {
    net[from] = (net[from] ?? 0) - amountCents;
    net[to] = (net[to] ?? 0) + amountCents;
  }
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amountCents: v }))
    .sort((x, y) => y.amountCents - x.amountCents);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amountCents: -v }))
    .sort((x, y) => y.amountCents - x.amountCents);

  const result: Debt[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const settled = Math.min(creditors[ci].amountCents, debtors[di].amountCents);
    if (settled > 0) {
      result.push({ from: debtors[di].id, to: creditors[ci].id, amountCents: settled });
    }
    creditors[ci].amountCents -= settled;
    debtors[di].amountCents -= settled;
    if (creditors[ci].amountCents === 0) ci++;
    if (debtors[di].amountCents === 0) di++;
  }
  return result;
}

export function calculateBalances(
  expenses: Record<string, Expense>,
  members: Record<string, Member>,
): { debts: Debt[]; memberBalances: MemberBalance[] } {
  const allDebts: Debt[] = [];
  for (const expense of Object.values(expenses)) {
    allDebts.push(...expenseDebts(expense));
  }
  const simplified = simplifyDebts(allDebts);

  const memberBalances: MemberBalance[] = Object.keys(members).map((memberId) => {
    let totalPaidCents = 0;
    let totalOwedCents = 0;
    for (const expense of Object.values(expenses)) {
      if (expense.paidById === memberId) totalPaidCents += expense.amountCents;
      const debts = expenseDebts(expense);
      for (const debt of debts) {
        if (debt.from === memberId) totalOwedCents += debt.amountCents;
      }
    }
    return {
      memberId,
      totalPaidCents,
      totalOwedCents,
      netCents: totalPaidCents - totalOwedCents,
    };
  });
  return { debts: simplified, memberBalances };
}

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O,0,I,1
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
