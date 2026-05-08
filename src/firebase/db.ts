import {
  ref, set, get, update, remove, onValue, off, runTransaction,
} from 'firebase/database';
import { db } from './config';
import { Group, Member, Expense } from '../types';
import { stripUndefined } from '../utils/firebase-safe';

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export async function createGroup(group: Group): Promise<void> {
  // Multi-path atomic write — both succeed or both fail.
  const updates: Record<string, unknown> = {};
  updates[`groups/${group.id}`] = stripUndefined(group);
  updates[`codes/${group.code}`] = group.id;
  await update(ref(db), updates);
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
  await set(ref(db, `groups/${groupId}/members/${member.id}`), stripUndefined(member));
}

// ─── Expense ops ─────────────────────────────────────────────────────────────

export async function addExpense(groupId: string, expense: Expense): Promise<void> {
  await set(ref(db, `groups/${groupId}/expenses/${expense.id}`), stripUndefined(expense));
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await remove(ref(db, `groups/${groupId}/expenses/${expenseId}`));
}

export async function settleExpense(
  groupId: string,
  expenseId: string,
  memberId: string,
): Promise<void> {
  // Transaction reads fresh server state, avoiding the read-modify-write race
  // when two members settle concurrently.
  const r = ref(db, `groups/${groupId}/expenses/${expenseId}/settledBy`);
  await runTransaction(r, (current: string[] | null) => {
    const list = Array.isArray(current) ? current : [];
    return list.includes(memberId)
      ? list.filter((id) => id !== memberId)
      : [...list, memberId];
  });
}

// ─── Group metadata (lightweight read for home screen) ────────────────────────

export interface GroupMeta {
  id: string;
  code: string;
  name: string;
  emoji: string;
  currency: string;
  memberCount: number;
  createdAt: number;
}

export async function getGroupMeta(groupId: string): Promise<GroupMeta | null> {
  const snap = await get(ref(db, `groups/${groupId}`));
  if (!snap.exists()) return null;
  const g = snap.val() as Group;
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    emoji: g.emoji,
    currency: g.currency,
    memberCount: Object.keys(g.members ?? {}).length,
    createdAt: g.createdAt,
  };
}
