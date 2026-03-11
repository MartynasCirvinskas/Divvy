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
  amount: number;         // always in group's base currency
  currency: string;       // e.g. 'USD', 'EUR'
  paidById: string;       // member id
  splitWith: string[];    // member ids (including payer if they share)
  splitType: SplitType;
  customAmounts?: Record<string, number>; // memberId → amount they owe
  category: ExpenseCategory;
  createdAt: number;
  settledBy: string[];    // memberIds who marked this as settled
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
  food:          { emoji: '🍔', label: 'Food & Drink' },
  transport:     { emoji: '🚗', label: 'Transport' },
  accommodation: { emoji: '🏠', label: 'Accommodation' },
  entertainment: { emoji: '🎉', label: 'Entertainment' },
  shopping:      { emoji: '🛍️', label: 'Shopping' },
  utilities:     { emoji: '💡', label: 'Utilities' },
  other:         { emoji: '📦', label: 'Other' },
};

export interface Group {
  id: string;
  code: string;           // 6-char join code (e.g. "XK92PL")
  name: string;
  emoji: string;
  members: Record<string, Member>;
  expenses: Record<string, Expense>;
  createdAt: number;
  currency: string;
}

// ─── Balance types ────────────────────────────────────────────────────────────

export interface Debt {
  from: string;  // member id
  to: string;    // member id
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  totalPaid: number;
  totalOwed: number;
  net: number;  // positive = others owe you, negative = you owe others
}

// ─── Local store types ────────────────────────────────────────────────────────

export interface LocalProfile {
  deviceId: string;   // anonymous user id (UUID, persisted locally)
  name: string;
  joinedGroups: string[];  // group ids
}
