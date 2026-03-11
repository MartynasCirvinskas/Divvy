import { useState, useEffect, useCallback } from 'react';
import { Group, Expense, Member } from '../types';
import { subscribeToGroup, addExpense, deleteExpense, settleExpense, addMember } from '../firebase/db';
import { calculateBalances } from '../utils/balances';
import type { Debt, MemberBalance } from '../types';

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }

    const unsub = subscribeToGroup(groupId, (g) => {
      setGroup(g);
      setLoading(false);
      if (g) {
        const { debts: d, memberBalances: mb } = calculateBalances(
          g.expenses ?? {},
          g.members ?? {}
        );
        setDebts(d);
        setMemberBalances(mb);
      }
    });

    return unsub;
  }, [groupId]);

  const handleAddExpense = useCallback(async (expense: Expense) => {
    if (!groupId) return;
    await addExpense(groupId, expense);
  }, [groupId]);

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    if (!groupId) return;
    await deleteExpense(groupId, expenseId);
  }, [groupId]);

  const handleSettleExpense = useCallback(async (expenseId: string, memberId: string) => {
    if (!groupId || !group) return;
    const expense = group.expenses?.[expenseId];
    if (!expense) return;
    await settleExpense(groupId, expenseId, memberId, expense.settledBy ?? []);
  }, [groupId, group]);

  const handleAddMember = useCallback(async (member: Member) => {
    if (!groupId) return;
    await addMember(groupId, member);
  }, [groupId]);

  return {
    group,
    loading,
    error,
    debts,
    memberBalances,
    addExpense: handleAddExpense,
    deleteExpense: handleDeleteExpense,
    settleExpense: handleSettleExpense,
    addMember: handleAddMember,
  };
}
