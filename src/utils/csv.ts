import { Expense, Member } from '../types';
import { fromCents } from './money';

function escape(field: string): string {
  if (/[",\n]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

export function expensesToCsv(
  expenses: Expense[],
  members: Record<string, Member>,
  groupCurrency: string,
): string {
  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount',
    'Currency',
    'Original amount',
    'Original currency',
    'Paid by',
    'Split with',
    'Split type',
    'Settled by',
  ];
  const rows = expenses.map((e) =>
    [
      new Date(e.createdAt).toISOString().slice(0, 10),
      e.description,
      e.category,
      fromCents(e.amountCents).toFixed(2),
      e.currency || groupCurrency,
      e.originalAmountCents != null ? fromCents(e.originalAmountCents).toFixed(2) : '',
      e.originalCurrency ?? '',
      members[e.paidById]?.name ?? e.paidById,
      e.splitWith.map((id) => members[id]?.name ?? id).join('; '),
      e.splitType,
      (e.settledBy ?? []).map((id) => members[id]?.name ?? id).join('; '),
    ]
      .map(escape)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}
