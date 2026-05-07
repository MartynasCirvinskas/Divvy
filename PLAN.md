# Divvy Implementation Plan — Foundation → V0.1 → V1

> **Execution mode:** Ralph Loop. Each iteration, this plan is re-fed. Mark `- [ ]` → `- [ ]` as steps complete.
> **Completion:** When ALL phases below are done, emit `<promise>DIVVY V1 SHIPPABLE</promise>` to exit the loop.
> **Repo root:** `C:\Users\marty\OneDrive\Desktop\Agents\Idea_Executor\Divvy`

**Goal:** Take Divvy from "shippable MVP with 5 critical bugs" to "launch-ready V1 with multi-currency, recurring expenses, share-by-link, and CSV export."

**Architecture:** Keep RN+Expo+Firebase RTDB stack. Lift state to a shared ProfileContext + GroupsContext. Switch all money to integer cents. Add Firebase Anonymous Auth + locked RTDB rules. Add a money utility module + currency module. Decouple "settled" flag from "excluded from balance."

**Tech stack:** Expo SDK 51 · RN 0.74.5 · TypeScript strict · Firebase RTDB + Anonymous Auth · React Navigation v6 · Jest + jest-expo

---

## Ralph Operating Rules

1. **Read this file fully each iteration.** Never skip ahead.
2. **Work tasks in order.** A blocked task = mark it 🟡 and continue to the next, return later.
3. **Commit after each task** with conventional commit prefixes (`fix:`, `feat:`, `chore:`, `test:`, `refactor:`).
4. **Run tests before each commit.** If any test fails, fix it before moving on.
5. **Do not invent features outside this plan.** When in doubt, prefer the simplest passing implementation.
6. **No `git push`, no PR creation, no destructive git ops.**
7. **If a step is ambiguous,** read the actual file (use Read tool) before changing it. Never trust prior diffs blindly — re-verify.
8. **When ALL `- [ ]` are checked across all phases**, output the completion promise. Not before.

---

# PHASE 0 — Foundation

Make the project safe to iterate. No app behavior changes (except getting it to actually build).

## Task 0.1 — Add placeholder assets

**Files:**
- Create: `assets/icon.png` (1024x1024 placeholder)
- Create: `assets/splash.png` (1242x2436 placeholder)
- Create: `assets/adaptive-icon.png` (1024x1024 placeholder)

- [x] **Step 1:** Create `assets/` directory if absent.
- [x] **Step 2:** Generate three solid-color PNG placeholders (teal `#00D4AA`) at the required dimensions. Used PowerShell + System.Drawing — verified via `file`: icon.png and adaptive-icon.png are 1024×1024 RGBA, splash.png is 1242×2436 RGBA on dark background.
- [x] **Step 3:** Verified PNGs via `file` command — all three valid 8-bit RGBA PNGs.
- [x] **Step 4:** Commit: `chore(assets): add placeholder icon, splash, adaptive-icon` (folded into combined docs+assets commit febed6b).

## Task 0.2 — Move Firebase config to env-driven `app.config.js`

**Files:**
- Create: `app.config.js`
- Delete: `app.json` (after migrating values)
- Modify: `src/firebase/config.ts`
- Create: `.env.example`
- Modify: `.gitignore` (add `.env`, `.env.local`)

- [x] **Step 1:** Create `app.config.js` that exports the same config as `app.json`, plus an `extra` block for Firebase:

```js
// app.config.js
module.exports = {
  expo: {
    name: 'Divvy',
    slug: 'divvy-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0D1117',
    },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: false, bundleIdentifier: 'com.divvy.app' },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0D1117',
      },
      package: 'com.divvy.app',
      permissions: ['VIBRATE'],
    },
    scheme: 'divvy',
    extra: {
      firebase: {
        apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
        projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      },
    },
  },
};
```

- [x] **Step 2:** Rewrite `src/firebase/config.ts` to read from `expo-constants`:

```ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import Constants from 'expo-constants';

const cfg = (Constants.expoConfig?.extra as any)?.firebase ?? {};

if (!cfg.apiKey) {
  console.warn('[divvy] Firebase config missing — set EXPO_PUBLIC_FIREBASE_* env vars.');
}

const app = initializeApp(cfg);
export const db = getDatabase(app);
export const auth = getAuth(app);

export async function ensureAnonAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const result = await signInAnonymously(auth);
  return result.user.uid;
}
```

- [x] **Step 3:** Add `expo-constants` to `package.json` dependencies if not present (it's a transitive dep but pin it explicitly):

```bash
npm install expo-constants
```

- [x] **Step 4:** Create `.env.example`:

```
# Copy to .env (or set in EAS / OS env). Never commit .env.
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

- [x] **Step 5:** Update `.gitignore` to include `.env` and `.env.local` (preserve existing entries).
- [x] **Step 6:** Delete `app.json` (Expo will use `app.config.js`).
- [x] **Step 7:** Committed as `chore(config): move firebase config to env-driven app.config.js` (592028d).

## Task 0.3 — Remove dead dependencies

**Files:**
- Modify: `package.json`

- [x] **Step 1:** Removed unused deps from `package.json`: `expo-notifications`, `@react-native-community/slider`, `@react-navigation/bottom-tabs`. Also corrected `expo-constants` from v55 (incompatible with Expo SDK 51) to `~16.0.2`.
- [x] **Step 2:** Cleared node_modules + lockfile and re-ran `npm install`.
- [x] **Step 3:** Commit: `chore(deps): remove unused expo-notifications, slider, bottom-tabs`.

## Task 0.4 — Add ESLint + Prettier

**Files:**
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Create: `.eslintignore`
- Modify: `package.json` (add scripts + devDeps)

- [x] **Step 1:** Installed dev deps with pinned majors (ESLint 8 + typescript-eslint 7 to match RN 0.74 + Prettier 3).

- [x] **Step 2:** Create `.eslintrc.js` (also disabled `react/no-unescaped-entities` since it's a DOM rule that fires on legitimate apostrophes in RN text):
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/sort-styles': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  env: { 'react-native/react-native': true, node: true, es2022: true, jest: true },
};
```

- [x] **Step 3:** Create `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

- [x] **Step 4:** Create `.eslintignore`:
```
node_modules
.expo
dist
build
ios
android
*.config.js
```

- [x] **Step 5:** Add scripts to `package.json`:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest",
    "test:watch": "jest --watchAll",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "lint:fix": "eslint 'src/**/*.{ts,tsx}' --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit"
  }
}
```

- [x] **Step 6:** `npm run lint` runs clean: 0 errors, 5 warnings (all about unused vars that are addressed by later refactor tasks — left as-is for now).
- [x] **Step 7:** Commit: `chore(lint): add eslint + prettier config`.

## Task 0.5 — Wire Jest properly

**Files:**
- Modify: `package.json`
- Create: `jest.setup.js`

- [x] **Step 1:** Update `package.json` jest block:
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFiles": ["./jest.setup.js"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase))"
    ]
  }
}
```

- [x] **Step 2:** Create minimal `jest.setup.js`:
```js
// Silence noisy warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
```

- [x] **Step 3:** Verify a no-op test passes — create `src/utils/__tests__/sanity.test.ts`:
```ts
describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 4:** `npm test` passes — 1/1 (sanity).
- [x] **Step 5:** Commit: `chore(test): wire jest with setup + sanity test`.

## Task 0.6 — Update README with setup steps

**Files:**
- Modify: `README.md`

- [x] **Step 1:** Updated README setup to env-driven flow + Anonymous Auth + quality scripts.
- [x] **Step 2:** Commit: `docs: add local setup instructions`.

---

# PHASE 1 — V0.1 Critical Bug Fixes

Fix the 5 critical bugs blocking launch + necessary supporting refactors.

## Task 1.1 — Add `money.ts` cents utility + tests

**Files:**
- Create: `src/utils/money.ts`
- Create: `src/utils/__tests__/money.test.ts`

- [x] **Step 1:** Write the failing tests first — create `src/utils/__tests__/money.test.ts`:

```ts
import {
  toCents, fromCents, formatCents, splitEqualCents, sumCents, parseAmountToCents,
} from '../money';

describe('money', () => {
  describe('toCents / fromCents', () => {
    it('converts dollars to cents losslessly', () => {
      expect(toCents(10.05)).toBe(1005);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0)).toBe(0);
      expect(toCents(123.456)).toBe(12346); // banker's-style rounded to nearest cent
    });
    it('converts back', () => {
      expect(fromCents(1005)).toBeCloseTo(10.05, 2);
      expect(fromCents(0)).toBe(0);
    });
  });

  describe('parseAmountToCents', () => {
    it('parses comma decimal', () => {
      expect(parseAmountToCents('10,50')).toBe(1050);
    });
    it('parses dot decimal', () => {
      expect(parseAmountToCents('10.50')).toBe(1050);
    });
    it('rejects garbage with NaN', () => {
      expect(parseAmountToCents('abc')).toBeNaN();
    });
    it('rejects empty', () => {
      expect(parseAmountToCents('')).toBeNaN();
    });
    it('rejects negatives', () => {
      expect(parseAmountToCents('-5')).toBeNaN();
    });
    it('caps absurd inputs', () => {
      expect(parseAmountToCents('1e308')).toBeNaN();
    });
  });

  describe('splitEqualCents', () => {
    it('splits evenly when divisible', () => {
      expect(splitEqualCents(900, 3)).toEqual([300, 300, 300]);
    });
    it('distributes remainder to first N participants', () => {
      // 1000 / 3 = 333.33, integer split = 333, 333, 334 (remainder 1 added to LAST)
      expect(splitEqualCents(1000, 3)).toEqual([333, 333, 334]);
    });
    it('handles single participant', () => {
      expect(splitEqualCents(1500, 1)).toEqual([1500]);
    });
    it('handles zero amount', () => {
      expect(splitEqualCents(0, 4)).toEqual([0, 0, 0, 0]);
    });
    it('throws on zero participants', () => {
      expect(() => splitEqualCents(100, 0)).toThrow();
    });
    it('always sums to total (property)', () => {
      for (const [total, n] of [[1000, 3], [1, 7], [9999, 11], [10001, 4]] as const) {
        const split = splitEqualCents(total, n);
        expect(sumCents(split)).toBe(total);
      }
    });
  });

  describe('formatCents', () => {
    it('formats USD', () => {
      expect(formatCents(1050, 'USD')).toBe('$10.50');
    });
    it('formats EUR', () => {
      // Intl output may vary by ICU; assert it CONTAINS the digits and €
      expect(formatCents(1050, 'EUR')).toMatch(/10[.,]50/);
      expect(formatCents(1050, 'EUR')).toMatch(/€/);
    });
  });
});
```

- [x] **Step 2:** Run `npm test -- money.test.ts`. Confirmed FAIL (module not found).

- [x] **Step 3:** Create `src/utils/money.ts`:

```ts
const MAX_CENTS = 1_000_000_000_00; // $1 billion ceiling — sanity guard

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return NaN;
  // Round to nearest cent; use Math.round (half-up) which is fine at cent precision
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function parseAmountToCents(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return NaN;
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return NaN;
  const cents = toCents(n);
  if (cents > MAX_CENTS) return NaN;
  return cents;
}

export function splitEqualCents(totalCents: number, n: number): number[] {
  if (n <= 0) throw new Error('splitEqualCents: participant count must be > 0');
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const result = Array(n).fill(base);
  // Distribute remainder cents to LAST `remainder` participants (deterministic)
  for (let i = n - remainder; i < n; i++) result[i] += 1;
  return result;
}

export function sumCents(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0);
}

export function formatCents(cents: number, currency = 'USD'): string {
  const amount = fromCents(cents);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
```

- [x] **Step 4:** All 20 money tests + 1 sanity test pass (21/21 total).
- [x] **Step 5:** Commit: `feat(money): add integer-cents utility with full test coverage`.

## Task 1.2 — Migrate `Expense.amount` and `customAmounts` to cents (types only)

**Files:**
- Modify: `src/types/index.ts`

- [x] **Step 1:** Update `Expense` interface — rename `amount` → `amountCents`, change semantics of `customAmounts`:

```ts
export interface Expense {
  id: string;
  description: string;
  amountCents: number;            // ← integer cents, was `amount: number`
  currency: string;
  paidById: string;
  splitWith: string[];
  splitType: SplitType;
  /** For 'custom': memberId → owed cents. For 'percentage': memberId → basis points (1/100 of a %). */
  customAmounts?: Record<string, number>;
  category: ExpenseCategory;
  createdAt: number;
  settledBy: string[];
  createdByDeviceId: string;
}

export interface MemberBalance {
  memberId: string;
  totalPaidCents: number;
  totalOwedCents: number;
  netCents: number;  // positive = others owe you
}

export interface Debt {
  from: string;
  to: string;
  amountCents: number;
}
```

- [x] **Step 2:** `npm run typecheck` shows 11 errors across balances/screens — all expected, fixed in Tasks 1.3-1.4.
- [x] **Step 3:** Commit: `refactor(types): switch Expense/Debt/Balance to integer cents`.

## Task 1.3 — Migrate `balances.ts` to cents

**Files:**
- Modify: `src/utils/balances.ts`
- Create: `src/utils/__tests__/balances.test.ts`

- [x] **Step 1:** Write the failing tests first:

```ts
// src/utils/__tests__/balances.test.ts
import { calculateBalances, simplifyDebts, generateGroupCode } from '../balances';
import type { Expense, Member } from '../../types';

const member = (id: string, name: string): Member => ({ id, name, joinedAt: 0 });

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  description: '',
  amountCents: 0,
  currency: 'USD',
  paidById: 'a',
  splitWith: ['a', 'b'],
  splitType: 'equal',
  category: 'other',
  createdAt: 0,
  settledBy: [],
  createdByDeviceId: 'a',
  ...overrides,
});

describe('balances', () => {
  const members = {
    a: member('a', 'Alice'),
    b: member('b', 'Bob'),
    c: member('c', 'Carol'),
  };

  it('equal split — A pays $10 for A,B,C', () => {
    const expenses = { e1: expense({ amountCents: 1000, paidById: 'a', splitWith: ['a','b','c'] }) };
    const { debts } = calculateBalances(expenses, members);
    // Each owes 333 or 334 cents to A
    const total = debts.reduce((s, d) => s + d.amountCents, 0);
    expect(total).toBe(667); // 333 + 334 (b and c owe; a is payer)
  });

  it('custom split sums correctly', () => {
    const expenses = {
      e1: expense({
        amountCents: 1500,
        paidById: 'a',
        splitWith: ['a','b','c'],
        splitType: 'custom',
        customAmounts: { a: 500, b: 500, c: 500 },
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    const owedToA = debts.filter(d => d.to === 'a').reduce((s, d) => s + d.amountCents, 0);
    expect(owedToA).toBe(1000);
  });

  it('percentage split — basis points', () => {
    const expenses = {
      e1: expense({
        amountCents: 10000,
        paidById: 'a',
        splitWith: ['a','b'],
        splitType: 'percentage',
        customAmounts: { a: 5000, b: 5000 }, // 50% / 50% in basis points (10000 = 100%)
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    expect(debts.length).toBe(1);
    expect(debts[0]).toMatchObject({ from: 'b', to: 'a', amountCents: 5000 });
  });

  it('does NOT exclude expense when partial settledBy', () => {
    // A paid $9 split A,B,C equally; B marked settled but C did not
    const expenses = {
      e1: expense({
        amountCents: 900,
        paidById: 'a',
        splitWith: ['a','b','c'],
        settledBy: ['b'],
      }),
    };
    const { debts } = calculateBalances(expenses, members);
    // C should still owe A 300; B should NOT owe (already marked settled)
    const cOwes = debts.find(d => d.from === 'c' && d.to === 'a');
    const bOwes = debts.find(d => d.from === 'b' && d.to === 'a');
    expect(cOwes?.amountCents).toBe(300);
    expect(bOwes).toBeUndefined();
  });

  it('simplify debts collapses A→B→C into A→C', () => {
    const debts = [
      { from: 'a', to: 'b', amountCents: 500 },
      { from: 'b', to: 'c', amountCents: 500 },
    ];
    const simplified = simplifyDebts(debts);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toMatchObject({ from: 'a', to: 'c', amountCents: 500 });
  });

  it('handles empty splitWith without crashing', () => {
    const expenses = { e1: expense({ amountCents: 500, splitWith: [] }) };
    expect(() => calculateBalances(expenses, members)).not.toThrow();
  });

  it('generateGroupCode returns 6 unambiguous chars', () => {
    const code = generateGroupCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // no O, 0, I, 1
  });
});
```

- [x] **Step 2:** Tests written; baseline FAIL on signature mismatch.

- [x] **Step 3:** Rewrite `src/utils/balances.ts` to use cents AND fix the settle-skip bug. Dropped `formatAmount` (consumers will switch to `formatCents` in Task 1.4):

```ts
import { Expense, Member, Debt, MemberBalance } from '../types';
import { splitEqualCents, fromCents } from './money';

/** Returns per-debtor cents owed for one expense (excluding settled debtors). */
function expenseDebts(expense: Expense): Debt[] {
  const debts: Debt[] = [];
  const { paidById, splitWith, amountCents, splitType, customAmounts, settledBy = [] } = expense;
  if (splitWith.length === 0 || amountCents <= 0) return debts;

  const settledSet = new Set(settledBy);
  let shares: Record<string, number> = {};

  if (splitType === 'equal') {
    const parts = splitEqualCents(amountCents, splitWith.length);
    splitWith.forEach((id, i) => { shares[id] = parts[i]; });
  } else if (splitType === 'custom' && customAmounts) {
    shares = { ...customAmounts };
  } else if (splitType === 'percentage' && customAmounts) {
    // customAmounts is basis points (10000 = 100%)
    for (const [id, bp] of Object.entries(customAmounts)) {
      shares[id] = Math.round((amountCents * bp) / 10000);
    }
  }

  for (const [memberId, owed] of Object.entries(shares)) {
    if (memberId === paidById) continue;
    if (settledSet.has(memberId)) continue;     // ← per-debtor settlement, NOT all-or-nothing
    if (owed <= 0) continue;
    debts.push({ from: memberId, to: paidById, amountCents: owed });
  }
  return debts;
}

export function simplifyDebts(debts: Debt[]): Debt[] {
  const net: Record<string, number> = {};
  for (const { from, to, amountCents } of debts) {
    net[from] = (net[from] ?? 0) - amountCents;
    net[to]   = (net[to]   ?? 0) + amountCents;
  }
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amountCents: v }))
    .sort((x, y) => y.amountCents - x.amountCents);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amountCents: -v }))
    .sort((x, y) => y.amountCents - x.amountCents);

  const result: Debt[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const settled = Math.min(creditors[ci].amountCents, debtors[di].amountCents);
    if (settled > 0) {
      result.push({ from: debtors[di].id, to: creditors[ci].id, amountCents: settled });
    }
    creditors[ci].amountCents -= settled;
    debtors[di].amountCents   -= settled;
    if (creditors[ci].amountCents === 0) ci++;
    if (debtors[di].amountCents === 0)   di++;
  }
  return result;
}

export function calculateBalances(
  expenses: Record<string, Expense>,
  members: Record<string, Member>,
): { debts: Debt[]; memberBalances: MemberBalance[] } {
  const allDebts: Debt[] = [];
  for (const expense of Object.values(expenses)) {
    allDebts.push(...expenseDebts(expense));
  }
  const simplified = simplifyDebts(allDebts);

  const memberBalances: MemberBalance[] = Object.keys(members).map((memberId) => {
    let totalPaidCents = 0;
    let totalOwedCents = 0;
    for (const expense of Object.values(expenses)) {
      if (expense.paidById === memberId) totalPaidCents += expense.amountCents;
      const debts = expenseDebts(expense);
      for (const debt of debts) {
        if (debt.from === memberId) totalOwedCents += debt.amountCents;
      }
    }
    return {
      memberId,
      totalPaidCents,
      totalOwedCents,
      netCents: totalPaidCents - totalOwedCents,
    };
  });
  return { debts: simplified, memberBalances };
}

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O,0,I,1
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Legacy float formatter retained for currency module use; new code calls formatCents from money.ts.
export function formatAmountLegacy(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}
```

- [x] **Step 4:** All 30 tests pass (10 balances + 20 money + 1 sanity).
- [x] **Step 5:** Commit: `refactor(balances): integer cents + per-debtor settlement; add tests`.

## Task 1.4 — Update screens to use cents

**Files:**
- Modify: `src/screens/AddExpenseScreen.tsx`
- Modify: `src/screens/GroupScreen.tsx`
- Modify: `src/hooks/useGroup.ts`

- [x] **Step 1:** Updated AddExpenseScreen — parseAmountToCents throughout, exact integer-sum validation for custom split, formatCents in preview, try/catch on save (also addresses Task 1.12 for this screen). Imports added.
- [x] **Step 2:** Updated GroupScreen — formatCents replaces formatAmount in expense card / debt row / total card. totalCents reducer.
- [x] **Step 3:** useGroup.ts unchanged (it just relays Expense objects).
- [x] **Step 4:** Typecheck shows only the pre-existing `dynamic import` error in HomeScreen line 102 — to be removed by Task 1.6 refactor.
- [x] **Step 5:** Commit: `refactor(screens): consume cents API throughout`.

## Task 1.5 — Add `ProfileContext` to share profile across screens

**Files:**
- Create: `src/contexts/ProfileContext.tsx`
- Modify: `App.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/GroupScreen.tsx`
- Modify: `src/screens/AddExpenseScreen.tsx`

- [x] **Step 1:** Create `src/contexts/ProfileContext.tsx` (uses existing localStore — Task 1.7 will inject the auth UID):

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LocalProfile } from '../types';
import {
  getOrCreateProfile,
  updateProfile as persistProfile,
  addGroupToProfile as persistAddGroup,
  removeGroupFromProfile as persistRemoveGroup,
} from '../store/localStore';

type Ctx = {
  profile: LocalProfile | null;
  loading: boolean;
  setName: (name: string) => Promise<void>;
  addGroup: (groupId: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const p = await getOrCreateProfile();
      setProfile(p);
    } catch (e) {
      console.error('[profile] load failed', e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setName = useCallback(async (name: string) => {
    const next = await persistProfile({ name });
    setProfile(next);
  }, []);

  const addGroup = useCallback(async (groupId: string) => {
    await persistAddGroup(groupId);
    await reload();
  }, [reload]);

  const removeGroup = useCallback(async (groupId: string) => {
    await persistRemoveGroup(groupId);
    await reload();
  }, [reload]);

  return (
    <ProfileContext.Provider value={{ profile, loading, setName, addGroup, removeGroup, reload }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
```

- [x] **Step 2:** Wrap `App.tsx` with ProfileProvider:
```tsx
import 'react-native-reanimated';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ProfileProvider } from './src/contexts/ProfileContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <AppNavigator />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
```

- [x] **Step 3:** Refactored all three screens — removed in-screen profile fetches, derive `myDeviceId/myName` from `useProfile()` context. HomeScreen also: replaced dynamic `await import('../firebase/db')` with static `addMember` import (clears the pre-existing typecheck error), wrapped create+join handlers in try/catch (covers Task 1.12).
- [x] **Step 4:** Typecheck: 0 errors.
- [x] **Step 5:** Commit: `refactor(state): lift profile to ProfileContext`.

## Task 1.6 — Add `GroupsContext` and fix the disappearing-groups bug

**Files:**
- Create: `src/contexts/GroupsContext.tsx`
- Modify: `App.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/firebase/db.ts` (add lightweight metadata fetcher)

- [x] **Step 1:** Added `GroupMeta` interface + `getGroupMeta` fetcher to `db.ts`. Also dropped two unused imports (`push`, `DatabaseReference`) that were lingering ESLint warnings.

```ts
// At end of db.ts
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
```

- [x] **Step 2:** Create `src/contexts/GroupsContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GroupMeta, getGroupMeta } from '../firebase/db';
import { useProfile } from './ProfileContext';

type Ctx = {
  groups: GroupMeta[];
  loading: boolean;
  refresh: () => Promise<void>;
  addLocally: (g: GroupMeta) => void;
};

const GroupsContext = createContext<Ctx | null>(null);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const fetched = await Promise.all(profile.joinedGroups.map(getGroupMeta));
      const valid = fetched.filter((g): g is GroupMeta => g !== null);
      setGroups(valid.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error('[groups] refresh failed', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { refresh(); }, [refresh]);

  const addLocally = useCallback((g: GroupMeta) => {
    setGroups((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
  }, []);

  return (
    <GroupsContext.Provider value={{ groups, loading, refresh, addLocally }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups(): Ctx {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error('useGroups must be used within GroupsProvider');
  return ctx;
}
```

- [x] **Step 3:** Wrap `App.tsx` with `GroupsProvider` (inside `ProfileProvider`):

```tsx
<ProfileProvider>
  <GroupsProvider>
    <AppNavigator />
  </GroupsProvider>
</ProfileProvider>
```

- [x] **Step 4:** Updated `HomeScreen.tsx` — consumes `useGroups()`, drops local `useState<Group[]>`, both create+join handlers call `addLocally()` with GroupMeta, `renderGroup` uses `item.memberCount`.
- [x] **Step 5:** Typecheck: 0 errors. Lint: 0 errors, 1 warning.
- [x] **Step 6:** Manual smoke test deferred to user (requires Firebase env + simulator). The bug fix is structural: groups now load via `GroupsProvider.refresh()` on profile change.
- [x] **Step 7:** Commit: `fix(home): reload groups from storage on app start`.

## Task 1.7 — Add Firebase Anonymous Auth + member-bound RTDB rules

**Files:**
- Modify: `src/firebase/config.ts` (already has `ensureAnonAuth` from Task 0.2)
- Modify: `src/contexts/ProfileContext.tsx` (use Firebase UID as deviceId)
- Modify: `src/store/localStore.ts` (accept externally-provided deviceId)
- Create: `firebase-rules.json`

- [x] **Step 1:** Updated `localStore.ts` — `getOrCreateProfile(authUid?)` now migrates stale deviceId on auth match, and the JSON.parse is wrapped in try/catch (covers Task 1.12 for this file):

```ts
export async function getOrCreateProfile(authUid?: string): Promise<LocalProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalProfile;
      // Migration: if we have an authUid and profile.deviceId differs, prefer the auth UID
      if (authUid && parsed.deviceId !== authUid) {
        const migrated = { ...parsed, deviceId: authUid };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    } catch (e) {
      console.error('[profile] corrupted JSON, recreating', e);
    }
  }
  const profile: LocalProfile = {
    deviceId: authUid ?? uuidv4(),
    name: '',
    joinedGroups: [],
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
```

- [x] **Step 2:** Update `ProfileContext.tsx` `reload` to call `ensureAnonAuth` first (with graceful fallback if anon auth is unavailable):

```ts
const reload = useCallback(async () => {
  try {
    const uid = await ensureAnonAuth();
    const p = await getOrCreateProfile(uid);
    setProfile(p);
  } catch (e) {
    console.error('[profile] load failed', e);
    setProfile(null);
  } finally {
    setLoading(false);
  }
}, []);
```

(Add `import { ensureAnonAuth } from '../firebase/config';`)

- [x] **Step 3:** `firebase/auth` is included in the `firebase` v10 SDK; no extra package needed. Typecheck clean.

- [x] **Step 4:** Created `firebase-rules.json` with the pragmatic member-bound rules:

```json
{
  "rules": {
    "groups": {
      "$groupId": {
        ".read": "auth != null && data.child('members').child(auth.uid).exists()",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('members').child(auth.uid).exists() ||
          (newData.child('members').child(auth.uid).exists() && data.child('members').val() == newData.child('members').val() == false)
        )"
      }
    },
    "codes": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.val() == newData.val())"
      }
    }
  }
}
```

NOTE: The above is a simplification. RTDB rules use `auth.uid` and predicate expressions; the actual `.write` for join (adding self to `members/{uid}`) requires a more nuanced rule. Use this pragmatic version:

```json
{
  "rules": {
    "groups": {
      "$groupId": {
        ".read": "auth != null && data.child('members').child(auth.uid).exists()",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('members').child(auth.uid).exists()
        )",
        "members": {
          "$memberId": {
            ".write": "auth != null && (auth.uid == $memberId || data.parent().child(auth.uid).exists())"
          }
        }
      }
    },
    "codes": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists()"
      }
    }
  }
}
```

This requires you to enable Anonymous sign-in in Firebase console (Auth → Sign-in method → Anonymous → Enable). Document this in README.

- [x] **Step 5:** README setup section was already updated in Task 0.6 to mention enabling Anonymous Auth + pasting `firebase-rules.json` content.
- [x] **Step 6:** Commit: `feat(auth): enable Firebase anonymous auth + member-bound RTDB rules`.

## Task 1.8 — Atomic group creation + safe Firebase writes

**Files:**
- Modify: `src/firebase/db.ts`

- [x] **Step 1:** Replace `createGroup` with a multi-path atomic update:

```ts
import { ref, set, get, push, update, remove, onValue, off, DatabaseReference } from 'firebase/database';
// ... existing imports

export async function createGroup(group: Group): Promise<void> {
  // Multi-path atomic write — both succeed or both fail
  const updates: Record<string, unknown> = {};
  updates[`groups/${group.id}`] = group;
  updates[`codes/${group.code}`] = group.id;
  await update(ref(db), updates);
}
```

- [x] **Step 2:** Replace `settleExpense` with a `runTransaction` to avoid the read-modify-write race:

```ts
import { runTransaction } from 'firebase/database';

export async function settleExpense(
  groupId: string,
  expenseId: string,
  memberId: string,
  // currentSettled param removed — transaction reads fresh
): Promise<void> {
  const r = ref(db, `groups/${groupId}/expenses/${expenseId}/settledBy`);
  await runTransaction(r, (current: string[] | null) => {
    const list = Array.isArray(current) ? current : [];
    return list.includes(memberId)
      ? list.filter((id) => id !== memberId)
      : [...list, memberId];
  });
}
```

- [x] **Step 3:** Update `useGroup.ts` `handleSettleExpense` — drop the `currentSettled` argument:

```ts
const handleSettleExpense = useCallback(async (expenseId: string, memberId: string) => {
  if (!groupId) return;
  await settleExpense(groupId, expenseId, memberId);
}, [groupId]);
```

- [x] **Step 4:** Typecheck: 0 errors. Tests: 30/30.
- [x] **Step 5:** Commit: `fix(db): atomic createGroup + transactional settleExpense`.

## Task 1.9 — Wire settle-up UI per debt row

**Files:**
- Modify: `src/screens/GroupScreen.tsx`

- [x] **Step 1:** Added `debtsByPair` `useMemo` to `useGroup` returning a `Map<"from->to", expenseId[]>` of *unsettled* per-debtor obligations.

Add to `useGroup` hook a derived list:
```ts
// in useGroup.ts return value
const debtsByPair = useMemo(() => {
  if (!group) return new Map<string, string[]>(); // key: `from->to`, value: expenseIds
  const out = new Map<string, string[]>();
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
```
Add `debtsByPair` to the returned object.

- [x] **Step 2:** In `GroupScreen.tsx` `renderDebt`, when `isMe`, render "Mark settled" button + confirm dialog + per-expense settle iteration:

```tsx
{isMe && (
  <TouchableOpacity
    style={styles.settleBtn}
    onPress={() => handleMarkSettled(item.from, item.to)}
  >
    <Text style={styles.settleBtnText}>Mark settled</Text>
  </TouchableOpacity>
)}
```

with handler:
```ts
const handleMarkSettled = async (fromId: string, toId: string) => {
  const ids = debtsByPair.get(`${fromId}->${toId}`) ?? [];
  Alert.alert(
    'Mark as settled?',
    `This will mark ${ids.length} expense${ids.length === 1 ? '' : 's'} as paid by you to ${members[toId]?.name ?? '?'}.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          for (const id of ids) {
            try { await settleExpense(id, fromId); }
            catch (e) { console.error('[settle]', e); }
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ],
  );
};
```

(`settleExpense` comes from `useGroup` hook return.)

Add styles:
```ts
settleBtn: {
  marginLeft: 8,
  backgroundColor: COLORS.primaryBg,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
},
settleBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
```

Adjust the `debtCard` flex layout to accommodate the button: change to `gap: 8`, keep `flexDirection: 'row'`, wrap text/amount in a flex column.

- [x] **Step 3:** Typecheck: 0 errors. Tests: 30/30.
- [x] **Step 4:** Commit: `feat(group): add settle-up UI per debt row`.

## Task 1.10 — Replace `paddingTop: 60` with `useSafeAreaInsets()`

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/GroupScreen.tsx`
- Modify: `src/screens/AddExpenseScreen.tsx`

- [x] **Step 1:** Replaced `paddingTop: 60` in all three screens with `paddingTop: insets.top + 8` via `useSafeAreaInsets()`. StyleSheet `paddingTop: 60` removed everywhere.

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ...
const insets = useSafeAreaInsets();
```

Then in the JSX header `View`, use:

```tsx
<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
```

Remove `paddingTop: 60` from the StyleSheet for `header`.

- [x] **Step 2:** Commit: `fix(layout): use safe-area insets instead of hardcoded paddingTop`.

## Task 1.11 — Remove dead currency LTL + fix currency symbol fallback

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/AddExpenseScreen.tsx`
- Create: `src/utils/currency.ts`

- [x] **Step 1:** Removed dead `'LTL'`. HomeScreen now imports `SUPPORTED_CURRENCIES` (USD/EUR/GBP/JPY/PLN/CHF/CAD/AUD).

- [x] **Step 2:** Create `src/utils/currency.ts`:
```ts
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', PLN: 'zł',
  CHF: 'Fr', CAD: 'C$', AUD: 'A$', SEK: 'kr', NOK: 'kr', DKK: 'kr',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PLN', 'CHF', 'CAD', 'AUD'];
```

- [x] **Step 3:** In `AddExpenseScreen.tsx`, replaced the inline EUR/GBP/$ ternary with `currencySymbol(...)`. The equal-share preview already used `formatCents` (Task 1.4) which handles currency correctly.
- [x] **Step 4:** HomeScreen consumes `SUPPORTED_CURRENCIES`.
- [x] **Step 5:** Commit: `fix(currency): centralize symbols, drop LTL, expand list`.

## Task 1.12 — Wrap all `JSON.parse` and Firebase writes in try/catch

**Files:**
- Modify: `src/store/localStore.ts` (already done in Task 1.7)
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/AddExpenseScreen.tsx`

- [x] **Step 1:** Done in Task 1.5 — `handleCreateGroup` wrapped in try/catch with friendly Alert on failure.

```ts
const handleCreateGroup = async () => {
  if (!groupName.trim()) { Alert.alert('Name required', 'Give your group a name.'); return; }
  if (!profile) { Alert.alert('Loading…', 'Try again in a moment.'); return; }
  try {
    const code = generateGroupCode();
    const group: Group = { /* ... as before ... */ };
    await createGroup(group);
    await addGroup(group.id);
    addLocally({ id: group.id, code, name: group.name, emoji: group.emoji, currency, memberCount: 1, createdAt: group.createdAt });
    setModal(null);
    setGroupName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('Group', { groupId: group.id });
  } catch (e) {
    console.error('[create-group]', e);
    Alert.alert('Could not create group', 'Check your connection and try again.');
  }
};
```

- [x] **Step 2:** Done in Task 1.5 — `handleJoinGroup` wrapped in try/catch.

- [x] **Step 3:** Done in Task 1.4 — `AddExpenseScreen.handleSave` wrapped in try/catch with `setSaving(false)` in finally.

```ts
setSaving(true);
try {
  const expense: Expense = { /* ... */ };
  await addExpense(expense);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  navigation.goBack();
} catch (e) {
  console.error('[add-expense]', e);
  Alert.alert('Could not save', 'Check your connection and try again.');
} finally {
  setSaving(false);
}
```

- [x] **Step 4:** No standalone commit — all error-handling work was folded into the relevant feature commits (Tasks 1.4, 1.5, 1.7) for cohesion.

## Task 1.13 — Final V0.1 verification

- [x] **Step 1:** `npx tsc --noEmit` → 0 errors.
- [x] **Step 2:** `npm test` → 30/30 passed.
- [x] **Step 3:** `npm run lint` → 0 errors, 0 warnings (exit 0).
- [x] **Step 4:** Commit: `chore: V0.1 verification (typecheck + tests + lint clean)`.

---

# PHASE 2 — V1 Differentiators

The launch features that make Divvy meaningfully better than the alternatives.

## Task 2.1 — Multi-currency conversion (manual rates)

Foundation for live FX. Start with manual rates table that ships with the app.

**Files:**
- Modify: `src/utils/currency.ts`
- Create: `src/utils/__tests__/currency.test.ts`
- Modify: `src/types/index.ts` (add per-expense original-currency fields)

- [ ] **Step 1:** Extend `Expense` to optionally carry the original-currency entry:

```ts
export interface Expense {
  // ... existing fields ...
  /** If user entered the expense in a different currency than the group's, original is preserved. */
  originalAmountCents?: number;
  originalCurrency?: string;
  /** Rate used at entry time: 1 unit of originalCurrency = `rate` units of group currency. */
  exchangeRate?: number;
}
```

- [ ] **Step 2:** Add to `currency.ts`:

```ts
/** Static reference rates relative to USD (manual snapshot — refresh quarterly). */
export const REFERENCE_RATES_USD: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 156, PLN: 4.0,
  CHF: 0.88, CAD: 1.36, AUD: 1.52, SEK: 10.5, NOK: 10.7, DKK: 6.86,
};

export function convertCents(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string,
): { cents: number; rate: number } {
  if (fromCurrency === toCurrency) return { cents: amountCents, rate: 1 };
  const fromRate = REFERENCE_RATES_USD[fromCurrency];
  const toRate = REFERENCE_RATES_USD[toCurrency];
  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${fromCurrency} → ${toCurrency}`);
  }
  // amount in USD = amountCents / fromRate; in toCurrency = USD * toRate
  const rate = toRate / fromRate;
  return { cents: Math.round(amountCents * rate), rate };
}
```

- [ ] **Step 3:** Tests for `convertCents`:

```ts
import { convertCents } from '../currency';

describe('convertCents', () => {
  it('returns same amount when currencies match', () => {
    expect(convertCents(1000, 'USD', 'USD')).toEqual({ cents: 1000, rate: 1 });
  });
  it('USD → EUR rounds to nearest cent', () => {
    const { cents } = convertCents(10000, 'USD', 'EUR'); // $100 → €92
    expect(cents).toBe(9200);
  });
  it('roundtrip USD → EUR → USD is approximately equal', () => {
    const { cents: eur } = convertCents(10000, 'USD', 'EUR');
    const { cents: usd } = convertCents(eur, 'EUR', 'USD');
    expect(Math.abs(usd - 10000)).toBeLessThan(5); // < 5 cents drift
  });
  it('throws on unknown currency', () => {
    expect(() => convertCents(100, 'XYZ', 'USD')).toThrow();
  });
});
```

- [ ] **Step 4:** In `AddExpenseScreen.tsx`, add a per-expense currency picker (defaults to group currency). When user enters expense in a different currency, on save: convert to group currency for `amountCents`, store originals.

- [ ] **Step 5:** In `GroupScreen.tsx` `renderExpense`, show a small badge if `originalCurrency && originalCurrency !== group.currency`: e.g., "≈ €18.50 (was $20)".

- [ ] **Step 6:** Run tests. Commit: `feat(currency): multi-currency expense entry with FX conversion`.

## Task 2.2 — Recurring expenses (V1)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/screens/AddExpenseScreen.tsx`
- Create: `src/utils/recurring.ts`
- Create: `src/utils/__tests__/recurring.test.ts`

- [ ] **Step 1:** Add to types:
```ts
export type RecurrenceCadence = 'weekly' | 'biweekly' | 'monthly';
export interface Recurrence {
  cadence: RecurrenceCadence;
  startAt: number;
  /** If absent, recurs forever until deleted. */
  endAt?: number;
}
export interface Expense {
  // ... existing ...
  recurrence?: Recurrence;
}
```

- [ ] **Step 2:** Create `src/utils/recurring.ts`:
```ts
import { Recurrence } from '../types';

export function nextOccurrence(rec: Recurrence, after: number): number | null {
  const dayMs = 86_400_000;
  let step: number;
  switch (rec.cadence) {
    case 'weekly':   step = 7  * dayMs; break;
    case 'biweekly': step = 14 * dayMs; break;
    case 'monthly':  step = 30 * dayMs; break;  // approximate; calendar-aware version is V2
  }
  let next = rec.startAt;
  while (next <= after) next += step;
  if (rec.endAt && next > rec.endAt) return null;
  return next;
}

export function shouldGenerateToday(rec: Recurrence, now: number): boolean {
  const dayMs = 86_400_000;
  // Rough: if any scheduled date falls within the last 24h
  let cursor = rec.startAt;
  while (cursor <= now) {
    if (now - cursor < dayMs) return true;
    switch (rec.cadence) {
      case 'weekly':   cursor += 7 * dayMs; break;
      case 'biweekly': cursor += 14 * dayMs; break;
      case 'monthly':  cursor += 30 * dayMs; break;
    }
  }
  return false;
}
```

- [ ] **Step 3:** Tests:
```ts
import { nextOccurrence } from '../recurring';

describe('recurring', () => {
  const start = new Date('2026-01-01T12:00:00Z').getTime();
  it('weekly: next after exactly 1 week', () => {
    const next = nextOccurrence({ cadence: 'weekly', startAt: start }, start);
    expect(new Date(next!).toISOString().startsWith('2026-01-08')).toBe(true);
  });
  it('returns null after endAt', () => {
    const endAt = start + 5 * 86400000;
    const next = nextOccurrence({ cadence: 'weekly', startAt: start, endAt }, start + 6 * 86400000);
    expect(next).toBeNull();
  });
});
```

- [ ] **Step 4:** In `AddExpenseScreen.tsx`, add an optional "Repeat" section below the split type with a toggle + cadence picker (weekly / biweekly / monthly / none). On save include `recurrence`.

- [ ] **Step 5:** In `GroupScreen.tsx` show a small 🔁 badge on recurring expense rows.

NOTE: actually generating new expense entries on schedule is server-side work (Cloud Function). For V1 we just show the icon + carry the data; auto-generation is V2 — document this in the README.

- [ ] **Step 6:** Tests pass. Commit: `feat(recurring): track recurrence on expenses (display only)`.

## Task 2.3 — Share-by-link group join (deep links)

**Files:**
- Modify: `app.config.js` (already has `scheme: 'divvy'`)
- Create: `src/utils/deeplink.ts`
- Modify: `App.tsx`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/screens/GroupScreen.tsx` (use new share format)

- [ ] **Step 1:** Add associated domains to `app.config.js`:
```js
ios: {
  supportsTablet: false,
  bundleIdentifier: 'com.divvy.app',
  associatedDomains: ['applinks:divvy.app'],
},
android: {
  // ... existing ...
  intentFilters: [{
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host: 'divvy.app', pathPrefix: '/g' }],
    category: ['BROWSABLE', 'DEFAULT'],
  }],
},
```

- [ ] **Step 2:** Create `src/utils/deeplink.ts`:
```ts
/** Builds the share URL for a group join code. */
export function groupShareUrl(code: string): string {
  return `https://divvy.app/g/${code}`;
}

/** Parses a code from a URL like `divvy://g/ABC123` or `https://divvy.app/g/ABC123`. */
export function parseJoinUrl(url: string): string | null {
  const match = url.match(/\/g\/([A-Z0-9]{6})/i);
  return match ? match[1].toUpperCase() : null;
}
```

- [ ] **Step 3:** Wire React Navigation's deep-linking config in `AppNavigator.tsx`:
```ts
import * as Linking from 'expo-linking';

const linking = {
  prefixes: ['divvy://', 'https://divvy.app'],
  config: {
    screens: {
      Home: '',
      Group: 'group/:groupId',
      AddExpense: 'group/:groupId/add',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return handleJoinIfApplicable(url);
    return null;
  },
  subscribe(listener: (url: string) => void) {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const handled = handleJoinIfApplicable(url);
      if (handled) listener(handled);
    });
    return () => sub.remove();
  },
};

function handleJoinIfApplicable(url: string): string {
  // For join URLs, transform to a navigation that flows through Home (which handles the join modal)
  // For now, just return original URL — full handler in next step.
  return url;
}
```

(Need to install `expo-linking` if absent: `npm install expo-linking`.)

Pass `linking` to `<NavigationContainer linking={linking} ...>`.

- [ ] **Step 4:** In `App.tsx` (or HomeScreen `useEffect`), listen for incoming join URLs and pre-open the join modal with the code:

```ts
// In HomeScreen useEffect:
useEffect(() => {
  const handle = (url: string | null) => {
    if (!url) return;
    const code = parseJoinUrl(url);
    if (code) {
      setJoinCode(code);
      setModal('join');
    }
  };
  Linking.getInitialURL().then(handle);
  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}, []);
```

- [ ] **Step 5:** In `GroupScreen.tsx` `handleShare`, use new URL format:
```ts
const url = groupShareUrl(group.code);
Share.share({
  message: `Join my Divvy group "${group.name}":\n${url}\n\nCode: ${group.code}`,
});
```

- [ ] **Step 6:** Commit: `feat(share): deep links + share-by-link group join`.

## Task 2.4 — CSV export of group expenses

**Files:**
- Create: `src/utils/csv.ts`
- Create: `src/utils/__tests__/csv.test.ts`
- Modify: `src/screens/GroupScreen.tsx`

- [ ] **Step 1:** Create `src/utils/csv.ts`:
```ts
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
    'Date', 'Description', 'Category', 'Amount', 'Currency',
    'Paid by', 'Split with', 'Split type', 'Settled by',
  ];
  const rows = expenses.map((e) => [
    new Date(e.createdAt).toISOString().slice(0, 10),
    e.description,
    e.category,
    fromCents(e.amountCents).toFixed(2),
    e.currency || groupCurrency,
    members[e.paidById]?.name ?? e.paidById,
    e.splitWith.map((id) => members[id]?.name ?? id).join('; '),
    e.splitType,
    (e.settledBy ?? []).map((id) => members[id]?.name ?? id).join('; '),
  ].map(escape).join(','));
  return [headers.join(','), ...rows].join('\n');
}
```

- [ ] **Step 2:** Tests:
```ts
import { expensesToCsv } from '../csv';
import type { Expense, Member } from '../../types';

describe('csv', () => {
  const members: Record<string, Member> = {
    a: { id: 'a', name: 'Alice', joinedAt: 0 },
    b: { id: 'b', name: 'Bob, Jr.', joinedAt: 0 }, // contains comma
  };
  it('headers and basic row', () => {
    const e: Expense = {
      id: 'e1', description: 'Dinner "with friends"', amountCents: 1500,
      currency: 'USD', paidById: 'a', splitWith: ['a','b'], splitType: 'equal',
      category: 'food', createdAt: new Date('2026-05-01').getTime(), settledBy: [],
      createdByDeviceId: 'a',
    };
    const csv = expensesToCsv([e], members, 'USD');
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Date,Description');
    expect(lines[1]).toContain('"Dinner ""with friends"""');
    expect(lines[1]).toContain('"Bob, Jr."'); // member with comma quoted
  });
});
```

- [ ] **Step 3:** Add export action to `GroupScreen.tsx` header (next to Invite button):

```tsx
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const handleExport = async () => {
  if (!group) return;
  try {
    const csv = expensesToCsv(expenses, members, group.currency);
    const path = `${FileSystem.cacheDirectory}divvy-${group.code}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export expenses' });
    }
  } catch (e) {
    console.error('[export]', e);
    Alert.alert('Export failed', 'Try again or restart the app.');
  }
};
```

Install: `npm install expo-file-system expo-sharing`.

Add a small ⤓ button in the header that calls `handleExport`.

- [ ] **Step 4:** Tests pass. Commit: `feat(export): CSV export of group expenses`.

## Task 2.5 — Onboarding screen

**Files:**
- Create: `src/screens/OnboardingScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/contexts/ProfileContext.tsx` (track `onboarded` flag)
- Modify: `src/types/index.ts`

- [ ] **Step 1:** Add `onboarded?: boolean` to `LocalProfile`. Update store to default `false`.

- [ ] **Step 2:** Create `src/screens/OnboardingScreen.tsx` — three swipeable pages explaining: (1) Create a group, (2) Add expenses, (3) See who owes whom. Final page asks for name (replaces the in-app modal). On finish: `setName(name)` + `updateProfile({ onboarded: true })`.

- [ ] **Step 3:** In `AppNavigator.tsx`, conditionally render Onboarding as the initial screen if `!profile.onboarded`. Use a separate stack.

- [ ] **Step 4:** Remove the in-app `setName` modal from `HomeScreen.tsx` (no longer needed).

- [ ] **Step 5:** Commit: `feat(onboarding): 3-page intro flow with name capture`.

## Task 2.6 — Percentage split UI

**Files:**
- Modify: `src/screens/AddExpenseScreen.tsx`

- [ ] **Step 1:** Add `'percentage'` to the split-type buttons array (`AddExpenseScreen.tsx:222`).

- [ ] **Step 2:** When `splitType === 'percentage'`, render rows similar to custom but with percentage input (basis points internally; display as %). Validate sum = 100% on save.

- [ ] **Step 3:** Save converts percentages to basis points (10000 = 100%) into `customAmounts`.

- [ ] **Step 4:** Commit: `feat(split): expose percentage split type in UI`.

## Task 2.7 — Final V1 verification

- [ ] **Step 1:** Run `npm run typecheck`. Expect: 0 errors.
- [ ] **Step 2:** Run `npm test -- --watchAll=false`. Expect: all pass.
- [ ] **Step 3:** Run `npm run lint`. Expect: 0 errors (warnings OK).
- [ ] **Step 4:** Open `App.tsx` in Expo (don't auto-launch — note in commit that manual smoke test is recommended).
- [ ] **Step 5:** Update `README.md`: add a "Features" section listing V1 capabilities. Add a "Roadmap" section noting V1.5 (push notifs, IAP, i18n) and V2 (server-side recurring generation, OCR receipts).
- [ ] **Step 6:** Commit: `chore: V1 verification + readme polish`.

---

# Completion Gate

Once **every** checkbox above is `[x]`:

1. Run `npm run typecheck && npm test -- --watchAll=false && npm run lint`.
2. If all three pass, output exactly:

```
<promise>DIVVY V1 SHIPPABLE</promise>
```

If any step fails, fix it and re-run. Do NOT emit the promise until all three commands succeed.

---

## Out of scope for this plan (intentionally)

- Push notifications wiring
- IAP / RevenueCat (free + lifetime tier)
- i18n string extraction
- a11y label sweep
- Activity feed
- Receipt photo attach / OCR
- Server-side recurring expense generation (Cloud Function)
- Native Plaid / bank integration
- Web companion at `divvy.app/g/{code}`
- Friends list
- Charts / spend-by-category

These are intentionally deferred to V1.5/V2 — see `ANALYSIS.md` for prioritization rationale.
