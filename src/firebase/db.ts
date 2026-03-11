import {
  ref, set, get, push, update, remove, onValue, off, DatabaseReference,
} from 'firebase/database';
import { db } from './config';
import { Group, Member, Expense } from '../types';

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export async function createGroup(group: Group): Promise<void> {
  await set(ref(db, `groups/${group.id}`), group);
  // Also index by code for fast lookups
  await set(ref(db, `codes/${group.code}`), group.id);
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const snap = await get(ref(db, `groups/${groupId}`));
  return snap.exists() ? (snap.val() as Group) : null;
}

export async function getGroupByCode(code: string): Promise<Group | null> {
  const codeSnap = await get(ref(db, `codes/${code.toUpperCase()}`));
  if (!codeSnap.exists()) return null;
  const groupId = codeSnap.val() as string;
  return getGroupById(groupId);
}

export function subscribeToGroup(
  groupId: string,
  onUpdate: (group: Group | null) => void
): () => void {
  const r = ref(db, `groups/${groupId}`);
  const handler = onValue(r, (snap) => {
    onUpdate(snap.exists() ? (snap.val() as Group) : null);
  });
  return () => off(r, 'value', handler);
}

// ─── Member ops ───────────────────────────────────────────────────────────────

export async function addMember(groupId: string, member: Member): Promise<void> {
  await set(ref(db, `groups/${groupId}/members/${member.id}`), member);
}

// ─── Expense ops ─────────────────────────────────────────────────────────────

export async function addExpense(groupId: string, expense: Expense): Promise<void> {
  await set(ref(db, `groups/${groupId}/expenses/${expense.id}`), expense);
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await remove(ref(db, `groups/${groupId}/expenses/${expenseId}`));
}

export async function settleExpense(
  groupId: string,
  expenseId: string,
  memberId: string,
  currentSettled: string[]
): Promise<void> {
  const next = currentSettled.includes(memberId)
    ? currentSettled.filter((id) => id !== memberId)
    : [...currentSettled, memberId];
  await update(ref(db, `groups/${groupId}/expenses/${expenseId}`), { settledBy: next });
}
