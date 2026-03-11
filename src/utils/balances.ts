import { Expense, Member, Debt, MemberBalance } from '../types';

// ─── Calculate how much each member owes per expense ─────────────────────────

function expenseDebts(expense: Expense): Debt[] {
  const debts: Debt[] = [];
  const { paidById, splitWith, amount, splitType, customAmounts } = expense;

  if (splitWith.length === 0) return debts;

  const participants = splitWith;

  let shares: Record<string, number> = {};

  if (splitType === 'equal') {
    const perPerson = amount / participants.length;
    for (const id of participants) {
      shares[id] = perPerson;
    }
  } else if (splitType === 'custom' && customAmounts) {
    shares = { ...customAmounts };
  } else if (splitType === 'percentage' && customAmounts) {
    for (const [id, pct] of Object.entries(customAmounts)) {
      shares[id] = (amount * pct) / 100;
    }
  }

  // People who owe = everyone in shares except the payer
  for (const [memberId, owed] of Object.entries(shares)) {
    if (memberId === paidById) continue; // payer doesn't owe themselves
    if (owed <= 0.001) continue;
    debts.push({ from: memberId, to: paidById, amount: owed });
  }

  return debts;
}

// ─── Simplify debts (debt minimization) ──────────────────────────────────────

export function simplifyDebts(debts: Debt[]): Debt[] {
  // Accumulate net balances
  const net: Record<string, number> = {};
  for (const { from, to, amount } of debts) {
    net[from] = (net[from] ?? 0) - amount;
    net[to]   = (net[to]   ?? 0) + amount;
  }

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.001)
    .map(([id, v]) => ({ id, amount: v }));
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.001)
    .map(([id, v]) => ({ id, amount: -v }));

  const result: Debt[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt   = debtors[di];
    const settled = Math.min(credit.amount, debt.amount);

    result.push({ from: debt.id, to: credit.id, amount: settled });

    credit.amount -= settled;
    debt.amount   -= settled;

    if (credit.amount < 0.001) ci++;
    if (debt.amount   < 0.001) di++;
  }

  return result;
}

// ─── Full group balance calculation ──────────────────────────────────────────

export function calculateBalances(
  expenses: Record<string, Expense>,
  members: Record<string, Member>
): { debts: Debt[]; memberBalances: MemberBalance[] } {
  const allDebts: Debt[] = [];

  for (const expense of Object.values(expenses)) {
    // Skip fully settled expenses
    if (expense.settledBy?.length >= expense.splitWith.length) continue;
    allDebts.push(...expenseDebts(expense));
  }

  const simplified = simplifyDebts(allDebts);

  // Member balance summaries
  const memberBalances: MemberBalance[] = Object.keys(members).map((memberId) => {
    let totalPaid = 0;
    let totalOwed = 0;

    for (const expense of Object.values(expenses)) {
      if (expense.paidById === memberId) totalPaid += expense.amount;
      const debts = expenseDebts(expense);
      for (const debt of debts) {
        if (debt.from === memberId) totalOwed += debt.amount;
      }
    }

    return {
      memberId,
      totalPaid,
      totalOwed,
      net: totalPaid - totalOwed,
    };
  });

  return { debts: simplified, memberBalances };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatAmount(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O,0,I,1
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
