import { useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Expense, Member } from '../types';
import {
  subscribeToGroup,
  addExpense,
  deleteExpense,
  settleExpense,
  addMember,
} from '../firebase/db';
import { calculateBalances } from '../utils/balances';
import type { Debt, MemberBalance } from '../types';

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setError(null);

    const unsub = subscribeToGroup(groupId, (g) => {
      setGroup(g);
      setLoading(false);
      if (g) {
        const { debts: d, memberBalances: mb } = calculateBalances(
          g.expenses ?? {},
          g.members ?? {},
        );
        setDebts(d);
        setMemberBalances(mb);
      }
    });

    return unsub;
  }, [groupId]);

  /**
   * Map of `${debtorId}->${creditorId}` -> array of expenseIds where the debtor
   * still owes the creditor (i.e. `splitWith` includes debtor, debtor is not
   * the payer, debtor is not yet in `settledBy`).
   *
   * Used by the per-debt settle-up UI: the user taps "Mark settled" on a row
   * (debtor->creditor) and the handler iterates this list.
   */
  const debtsByPair = useMemo(() => {
    const out = new Map<string, string[]>();
    if (!group) return out;
    for (const e of Object.values(group.expenses ?? {})) {
      const settled = new Set(e.settledBy ?? []);
      for (const debtorId of e.splitWith) {
        if (debtorId === e.paidById) continue;
        if (settled.has(debtorId)) continue;
        const key = `${debtorId}->${e.paidById}`;
        const arr = out.get(key) ?? [];
        arr.push(e.id);
        out.set(key, arr);
      }
    }
    return out;
  }, [group]);

  const handleAddExpense = useCallback(
    async (expense: Expense) => {
      if (!groupId) return;
      await addExpense(groupId, expense);
    },
    [groupId],
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!groupId) return;
      await deleteExpense(groupId, expenseId);
    },
    [groupId],
  );

  const handleSettleExpense = useCallback(
    async (expenseId: string, memberId: string) => {
      if (!groupId) return;
      await settleExpense(groupId, expenseId, memberId);
    },
    [groupId],
  );

  const handleAddMember = useCallback(
    async (member: Member) => {
      if (!groupId) return;
      await addMember(groupId, member);
    },
    [groupId],
  );

  return {
    group,
    loading,
    error,
    debts,
    memberBalances,
    debtsByPair,
    addExpense: handleAddExpense,
    deleteExpense: handleDeleteExpense,
    settleExpense: handleSettleExpense,
    addMember: handleAddMember,
  };
}
