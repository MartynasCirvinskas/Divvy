// ─── Core data types ──────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  joinedAt: number;
}

export type SplitType = 'equal' | 'custom' | 'percentage';

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

// ─── Local store types ────────────────────────────────────────────────────────

export interface LocalProfile {
  /** Anonymous identity. Phase 1.7 swaps this to the Firebase Anonymous Auth UID. */
  deviceId: string;
  name: string;
  joinedGroups: string[];
}
