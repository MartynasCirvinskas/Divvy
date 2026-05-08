// ─── Core data types ──────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  joinedAt: number;
  /** "MM-DD" — optional, used for birthday reminders. */
  birthday?: string;
}

export type SplitType = 'equal' | 'custom' | 'percentage';

export type RecurrenceCadence = 'weekly' | 'biweekly' | 'monthly';

export interface Recurrence {
  cadence: RecurrenceCadence;
  startAt: number;
  /** If absent, recurs indefinitely until the expense is deleted. */
  endAt?: number;
}

export interface Expense {
  id: string;
  description: string;
  /** Integer cents in the group's base currency. */
  amountCents: number;
  /** Display currency (matches group currency unless explicitly overridden by FX flow). */
  currency: string;
  paidById: string;
  splitWith: string[]; // member ids (including payer if they share)
  splitType: SplitType;
  /** For 'custom': memberId → owed cents. For 'percentage': memberId → basis points (1/100 of a %). */
  customAmounts?: Record<string, number>;
  category: ExpenseCategory;
  createdAt: number;
  /** Member ids who marked their own debt on this expense as settled. */
  settledBy: string[];
  createdByDeviceId: string;
  /** Original amount as entered (cents), preserved when entered in a non-group currency. */
  originalAmountCents?: number;
  /** Original currency code as entered. */
  originalCurrency?: string;
  /** FX rate used at entry time: 1 unit of `originalCurrency` = `exchangeRate` units of group currency. */
  exchangeRate?: number;
  /** Optional recurrence metadata. Display-only in V1; server-side auto-generation is V2. */
  recurrence?: Recurrence;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'other';

export const CATEGORY_META: Record<ExpenseCategory, { emoji: string; label: string }> = {
  food: { emoji: '🍔', label: 'Food & Drink' },
  transport: { emoji: '🚗', label: 'Transport' },
  accommodation: { emoji: '🏠', label: 'Accommodation' },
  entertainment: { emoji: '🎉', label: 'Entertainment' },
  shopping: { emoji: '🛍️', label: 'Shopping' },
  utilities: { emoji: '💡', label: 'Utilities' },
  other: { emoji: '📦', label: 'Other' },
};

export interface Group {
  id: string;
  code: string; // 6-char join code (e.g. "XK92PL")
  name: string;
  emoji: string;
  members: Record<string, Member>;
  expenses: Record<string, Expense>;
  createdAt: number;
  currency: string;
}

// ─── Balance types ────────────────────────────────────────────────────────────

export interface Debt {
  from: string;
  to: string;
  /** Integer cents owed in the group's base currency. */
  amountCents: number;
}

export interface MemberBalance {
  memberId: string;
  totalPaidCents: number;
  totalOwedCents: number;
  /** positive = others owe you; negative = you owe others. */
  netCents: number;
}

// ─── Game session types ───────────────────────────────────────────────────────

export type ScoringDirection = 'high-wins' | 'low-wins';

export interface GameSession {
  id: string;
  groupId: string;
  name: string;
  scoringDirection: ScoringDirection;
  /** Member ids OR free-form team strings (e.g. "Team Alpha"). Free-form
   *  strings are prefixed with `team:` so they can't collide with member ids. */
  participants: string[];
  /** Map participant id → integer score. */
  scores: Record<string, number>;
  createdAt: number;
  endedAt?: number;
  /** Winner id, computed and stored on session end. */
  winnerId?: string;
  createdByDeviceId: string;
}

// ─── Wishlist types ───────────────────────────────────────────────────────────

export interface WishItem {
  id: string;
  title: string;
  url?: string;
  priceCents?: number;
  createdAt: number;
}

/**
 * Stored at a separate path from the items so the wishlist owner can't read
 * who claimed what (preserves the gift surprise). RTDB rules enforce: claims
 * readable+writable by group members EXCEPT the owner.
 */
export interface WishItemClaim {
  itemId: string;
  claimedBy: string; // memberId
  claimedAt: number;
}

// ─── Local store types ────────────────────────────────────────────────────────

export interface LocalProfile {
  /** Anonymous identity. Phase 1.7 swaps this to the Firebase Anonymous Auth UID. */
  deviceId: string;
  name: string;
  joinedGroups: string[];
  /** True after the user completes the onboarding flow. */
  onboarded?: boolean;
}
