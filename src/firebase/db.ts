import {
  ref, set, get, update, remove, onValue, off, runTransaction,
} from 'firebase/database';
import { db } from './config';
import { Group, Member, Expense, GameSession, WishItem, WishItemClaim } from '../types';
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

// ─── Game session ops ────────────────────────────────────────────────────────

export async function createGameSession(session: GameSession): Promise<void> {
  await set(
    ref(db, `groups/${session.groupId}/games/${session.id}`),
    stripUndefined(session),
  );
}

export async function deleteGameSession(groupId: string, sessionId: string): Promise<void> {
  await remove(ref(db, `groups/${groupId}/games/${sessionId}`));
}

/**
 * Atomically increment one participant's score (delta can be negative).
 * Uses runTransaction so concurrent score adjustments don't clobber each other.
 */
export async function adjustScore(
  groupId: string,
  sessionId: string,
  participantId: string,
  delta: number,
): Promise<void> {
  const r = ref(db, `groups/${groupId}/games/${sessionId}/scores/${participantId}`);
  await runTransaction(r, (current: number | null) => (current ?? 0) + delta);
}

export async function endGameSession(
  groupId: string,
  sessionId: string,
  winnerId: string,
): Promise<void> {
  await update(ref(db, `groups/${groupId}/games/${sessionId}`), {
    endedAt: Date.now(),
    winnerId,
  });
}

export function subscribeToGameSession(
  groupId: string,
  sessionId: string,
  onUpdate: (session: GameSession | null) => void,
): () => void {
  const r = ref(db, `groups/${groupId}/games/${sessionId}`);
  const handler = onValue(r, (snap) => {
    onUpdate(snap.exists() ? (snap.val() as GameSession) : null);
  });
  return () => off(r, 'value', handler);
}

export function subscribeToGameSessions(
  groupId: string,
  onUpdate: (sessions: GameSession[]) => void,
): () => void {
  const r = ref(db, `groups/${groupId}/games`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) {
      onUpdate([]);
      return;
    }
    const map = snap.val() as Record<string, GameSession>;
    const list = Object.values(map).sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(list);
  });
  return () => off(r, 'value', handler);
}

// ─── Wishlist ops ────────────────────────────────────────────────────────────

/** Items are public — group members can read each other's wishlists. */
export async function addWishItem(
  groupId: string,
  ownerMemberId: string,
  item: WishItem,
): Promise<void> {
  await set(
    ref(db, `groups/${groupId}/wishlists/${ownerMemberId}/items/${item.id}`),
    stripUndefined(item),
  );
}

export async function deleteWishItem(
  groupId: string,
  ownerMemberId: string,
  itemId: string,
): Promise<void> {
  // Atomic — also clear any existing claim on this item.
  await update(ref(db), {
    [`groups/${groupId}/wishlists/${ownerMemberId}/items/${itemId}`]: null,
    [`groups/${groupId}/wishlists/${ownerMemberId}/claims/${itemId}`]: null,
  });
}

/**
 * Claims live in a SEPARATE path from items so the wishlist owner can't see
 * who claimed an item (preserves the gift surprise). RTDB rules in
 * firebase-rules.json restrict /claims/* to be unreadable by the owner.
 */
export async function claimWishItem(
  groupId: string,
  ownerMemberId: string,
  itemId: string,
  claimerMemberId: string,
): Promise<void> {
  const claim: WishItemClaim = {
    itemId,
    claimedBy: claimerMemberId,
    claimedAt: Date.now(),
  };
  await set(
    ref(db, `groups/${groupId}/wishlists/${ownerMemberId}/claims/${itemId}`),
    stripUndefined(claim),
  );
}

export async function unclaimWishItem(
  groupId: string,
  ownerMemberId: string,
  itemId: string,
): Promise<void> {
  await remove(ref(db, `groups/${groupId}/wishlists/${ownerMemberId}/claims/${itemId}`));
}

/**
 * Subscribe to all items + (visible) claims for one member's wishlist within
 * a group. Owner sees only items; claimer/others see items + claims they
 * can read per RTDB rules.
 */
export function subscribeToWishlist(
  groupId: string,
  ownerMemberId: string,
  onUpdate: (items: WishItem[], claims: Record<string, WishItemClaim>) => void,
): () => void {
  const r = ref(db, `groups/${groupId}/wishlists/${ownerMemberId}`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) {
      onUpdate([], {});
      return;
    }
    const data = snap.val() as {
      items?: Record<string, WishItem>;
      claims?: Record<string, WishItemClaim>;
    };
    const items = Object.values(data.items ?? {}).sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(items, data.claims ?? {});
  });
  return () => off(r, 'value', handler);
}
