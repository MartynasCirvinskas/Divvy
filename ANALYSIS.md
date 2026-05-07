# Divvy — Deep Analysis & Roadmap

**Generated:** 2026-05-07
**Repo:** https://github.com/MartynasCirvinskas/Divvy
**Stack:** React Native 0.74.5 · Expo SDK 51 · TypeScript (strict) · Firebase Realtime Database · React Navigation v6
**One-liner:** A clean Splitwise alternative — no ads, no daily limits, no accounts.

---

## TL;DR

Divvy is a **shippable MVP**, not a skeleton. The core flow (create group → add expense → see balance) works end-to-end. The codebase is small (10 source files), TypeScript-strict, and architecturally clean for its size.

**But** there are five things that would tank a launch today:

1. Firestore-… sorry, **Realtime DB rules are wide-open** — any group ID = full read/write to the whole group.
2. **HomeScreen never reloads groups from storage on app restart.** Restart the app, your groups disappear from the list (data is still in DB but no UI surfaces it).
3. **No settle-up UI.** The function exists, the algorithm exists, no button calls it. The whole loop is incomplete.
4. **Money math uses JS floats.** Custom-amount validation has a $0.01 tolerance, but rounding errors flow into the DB and accumulate.
5. **Identity is a device-local UUID.** Clear app data → permanently orphaned from your groups, no recovery path.

The market opportunity is real and timely — Splitwise has self-inflicted enough damage that "the Splitwise you remember" is a viable wedge. **Divvy's biggest moat is what it doesn't do**: no accounts, no ads, no caps. Lean into it.

---

## 1. Project State

| | |
|---|---|
| Real or skeleton? | **Real, working MVP** |
| Source files | 10 (`src/`) |
| Screens | 3 (Home, Group, AddExpense) |
| Languages | 100% TypeScript, `strict: true` |
| Build readiness | **Blocked**: Firebase config is placeholder strings; `assets/` (icon, splash) referenced but missing |

### Tech stack specifics

- **Expo SDK 51 / RN 0.74.5** — current enough to ship to App Store / Play, but SDK 52 has shipped. Plan an upgrade.
- **React Navigation v6 native-stack** (bottom-tabs is installed but unused — dead dep)
- **Firebase JS SDK v10 → Realtime Database only** (no Auth, no Firestore, no Functions, no Storage)
- **AsyncStorage** for local anonymous identity (`@divvy_profile_v1`)
- **No state management library** — `useState` + a single `useGroup` custom hook
- **No tests, no ESLint, no Prettier, no CI**

### What ships broken right now

- `src/firebase/config.ts:27-35` — All placeholder strings (`'YOUR_API_KEY'`, etc). No `.env` pattern.
- `app.json` references `./assets/icon.png` etc — files not in repo. Fresh clone fails Expo asset load.
- `expo-notifications` and `@react-native-community/slider` in `package.json` with **zero usage** — bloat.

---

## 2. Feature Inventory

| Feature | Status | Notes |
|---|---|---|
| Create group / join by 6-char code | ✅ | Emoji picker + currency selection on create |
| Add / list expense | ✅ | Equal + custom (exact) splits |
| **Percentage splits** | 🟡 | Type defined, util handles it, **UI never renders the button** (`AddExpenseScreen.tsx:222` hardcodes `['equal','custom']`) |
| Delete expense | 🟡 | Wired in `useGroup`, **no UI exposes it** |
| Balances view + simplified debts | ✅ | Min-cash-flow algorithm in `balances.ts:40-73` |
| **Settle-up action** | 🟡 | `settleExpense` exists; **no UI calls it**. Loop is broken without this. |
| Friends / contacts | ❌ | No persistent users; identity = device UUID |
| Activity feed | ❌ | |
| Multi-currency conversion | ❌ | Currency is a label only — no FX |
| Receipt OCR / photo attach | ❌ | README markets as "Pro" |
| Recurring expenses | ❌ | |
| CSV / PDF export | ❌ | README markets as "Pro" |
| Push notifications | ❌ | Permission declared in `app.json:27`, zero code in `src/` |
| IAP / RevenueCat | ❌ | |
| Dark mode | ✅ | `useThemeColors` + `useColorScheme`, NavigationContainer themed |
| Offline support | ❌ | RTDB SDK has cache, but no explicit persistence config or UX indicator |
| i18n | ❌ | Hardcoded English |
| a11y labels | ❌ | No `accessibilityLabel`/`accessibilityRole` anywhere |
| Onboarding | 🟡 | Single name-prompt modal; nothing else |
| Haptics | ✅ | Used consistently on success actions |

---

## 3. Architecture & Code Quality

**Folder layout** — clean and intentional for the file count:

```
src/
├── firebase/        config.ts, db.ts
├── hooks/           useGroup.ts (the only non-trivial hook)
├── navigation/      AppNavigator.tsx
├── screens/         HomeScreen, GroupScreen, AddExpenseScreen
├── store/           localStore.ts (AsyncStorage profile)
├── theme/           colors + useThemeColors
├── types/           index.ts (canonical model)
└── utils/           balances.ts (pure, well-structured)
```

**Separation of concerns is good.** Firebase I/O lives in `src/firebase/db.ts`. Pure math (debt minimization, settlement) is in `utils/balances.ts`. Real-time subscription wrapped in `useGroup`.

**State management** — context-free and prop-drilling-free. Each screen independently calls `getOrCreateProfile()` in its own `useEffect` (`HomeScreen.tsx:42`, `GroupScreen.tsx:33`, `AddExpenseScreen.tsx:40`). Three independent AsyncStorage reads on every navigation. Profile changes don't propagate until remount. **Lift to a Context (10 lines) before V1.**

**Firebase data model** — RTDB, denormalized:
```
/groups/{groupId}   → full group: members map + expenses map
/codes/{code}       → reverse index: code → groupId
```
Whole group loaded on every subscription event. No pagination, no field masking. Acceptable for current scale; ceiling is ~500 expenses before payload becomes painful.

**TypeScript rigor** — `strict: true`, types specific and well-named. **One real hole**: `snap.val() as Group` in `db.ts:17,34` is unchecked. If DB shape diverges (after a future migration), bad data silently flows downstream. Add a runtime validator (zod ~150 LOC).

**Reuse** — theme system is consistently applied. Beyond `COLORS`/`useThemeColors`, **all UI is inline per-screen** — buttons, chips, modals, headers duplicated three ways. Fine for 3 screens; will rot at 6+.

---

## 4. Critical Bugs

### 🔥 HomeScreen groups vanish on app restart
`HomeScreen.tsx:25` initializes `groups: []`. On mount, it reads the profile (which contains `joinedGroups` IDs), but **nothing fetches/subscribes to those groups.** Groups only appear after they're added via `setGroups` calls in `handleCreateGroup:77` / `handleJoinGroup:105`.

**Result:** restart the app → group list is empty → user thinks the app lost their data.

**Fix:** on profile load, iterate `joinedGroups` and either fetch lightweight metadata via `subscribeToGroup` or maintain a denormalized index of "user → groups."

### 🔥 Wide-open Realtime DB rules
README/`config.ts:12-21` ship with:
```json
"groups": { "$groupId": { ".read": true, ".write": true } },
"codes":  { "$code":    { ".read": true, ".write": true } }
```
Anyone who knows a group ID can read or overwrite the entire group. Codes can be remapped or collided. **No member-only writes.**

**Fix:** even without Auth, you can require known group ID + member UUID matching a list inside the group doc (server-validated). Or migrate to anonymous-Auth + UID-keyed rules.

### 🔥 Settle-up logic conflates "ack'd" with "paid"
`balances.ts:84-86` skips an expense from balance calc if `settledBy.length >= splitWith.length`. But `settledBy` only tracks who tapped a button — not whether money moved. Three people ack → expense excluded → payer's real debt is zeroed.

**Fix:** decouple "individually settled" (per-debtor flag) from "expense excluded from totals." Better: store explicit `Payment` records, never mutate the expense.

### 🔥 Floating-point money throughout
`parseFloat(amount.replace(',', '.'))` at `AddExpenseScreen.tsx:59`. Equal split = `amount / N` produces repeating decimals; rounding errors accumulate across expenses. The $0.01 tolerance only protects the form, not the DB.

**Fix:** integer-cent everywhere. Store `amountCents: number`. Convert at the UI boundary. Use a tiny lib or write 30 LOC.

### 🔥 No-Auth identity orphans users
Clear app data, lose phone, factory reset → permanently orphaned from groups. No reauth, no "sign in on another device."

**Fix:** Firebase Anonymous Auth (1-line opt-in) + `linkWithCredential` upgrade path to email/Apple/Google later. UID becomes stable across reinstalls if the user opts in.

---

## 5. Tech Debt & Smells

### Dead / unreachable code
- `percentage` split → declared, computed, never rendered (see Critical Bugs above)
- `deleteExpense`, `settleExpense` → exported, never called
- `expo-notifications`, `@react-native-community/slider` → installed, never imported
- `memberBalances` → returned by `useGroup:22-26`, never rendered

### Magic numbers
- `paddingTop: 60` for safe-area headers in **all three screens** (`HomeScreen:276`, `GroupScreen:205`, `AddExpenseScreen:281`). `SafeAreaProvider` is mounted in `App.tsx:8` — just call `useSafeAreaInsets()`.
- Hardcoded button text colors: `color: '#000'` (`HomeScreen:330`, `GroupScreen:281`, `AddExpenseScreen:363`) outside the theme system.
- `'LTL'` (Lithuanian Litas) in currency list at `HomeScreen:226` — replaced by EUR in **2015**.
- Currency-symbol logic at `AddExpenseScreen:137-139` only handles EUR, GBP. JPY, PLN, LTL all incorrectly render as `$`.

### Missing error handling
- `handleCreateGroup` / `handleJoinGroup` (`HomeScreen:57-109`) — network writes with **no try/catch**. Quota exceeded / offline = silent failure, modal closes.
- `addExpense` (`AddExpenseScreen:104`) — same pattern.
- `JSON.parse(raw)` in `localStore.ts:9` — no try/catch. Corrupted AsyncStorage entry crashes app at startup.

### Race conditions
- `createGroup` (`db.ts:9-13`) writes `/groups/{id}` and `/codes/{code}` separately. **Not atomic.** Failed second write = unreachable group.
- `settleExpense` (`useGroup.ts:45`) is read-modify-write on `expense.settledBy` array. Two concurrent settlers = lost write.

### Input validation
- No max length on group name / expense description.
- No validation that `paidById` is actually a member of the group.
- Amount accepts inputs like `1e308`.

---

## 6. Testing & Tooling

| | Status |
|---|---|
| Tests | ❌ Zero. `jest-expo` configured, suite empty. `balances.ts` is pure and trivially testable. |
| ESLint | ❌ |
| Prettier | ❌ |
| CI | ❌ No `.github/workflows/` |
| TS strict | ✅ |

**Day-1 wins:** add ESLint + RN config, add tests for `balances.ts` (debt min, equal/custom/percentage splits, edge cases like single-member groups).

---

## 7. Market Context

### What Splitwise users are actually leaving over (mid-2024 → 2026)

The Splitwise enshittification arc is well-documented. Reddit, App Store 1-stars, and Trustpilot converge on a tight list:

1. **10-second cooldown between expense entries** on free tier — pure dark-pattern friction
2. **3-expense daily cap** on free — breaks "group dinner + bar + cab in one night"
3. **Simplify Debts removed from free tier** — was the flagship feature for a decade
4. **Currency conversion paywalled** at $5/mo — but travel is the #1 use case
5. **Receipt scanning paywalled**
6. **Group breakdown when only one member is Pro** — frustrates paying users

Pricing today: **Splitwise Pro $4.99/mo or $49.99/yr**. App Store rating ~3.7, with the loud cluster of 1-stars all citing the same 6 things.

### The competitive cohort

| App | Pricing | Hook | Weakness |
|---|---|---|---|
| **Tricount (bunq)** | Free, no ads, no premium | Clean UX, multi-currency, EU-strong, no account | CSV export removed (much complained about), no recurring, no receipts |
| **Settle Up** | Per-group one-time Premium | Nails the trip use case — "split the cost of Premium across 6 people" | Niche pricing model; needs the group-share dynamic to convert |
| **Splid** | $4.99 lifetime | Offline-first w/ sync, 150+ currencies, share-by-link join | Trip-focused, free capped at 1 active group |
| **PartyTab / Spliit / SplitPro / Spllito** | Various OSS / freemium | All explicitly position "no ads, no caps" | Most are web/PWA — feel like webapps in a wrapper |

**Divvy's RN+Expo native feel is a real moat against the OSS web cohort.** Going head-to-head with Tricount/Splid is the harder fight — they have polish + multi-currency.

### Monetization patterns that work

- **Splid's $4.99 lifetime** — beloved in reviews, lowest-friction
- **Settle Up's per-group one-time** — David Vávra (founder) [published 2025 results](https://medium.com/step-up-labs/summary-of-2025-changes-in-monetization-of-settle-up-results-7ad316d559c7) showing this outperformed their old subscription. The group splits the cost ($X / 6 people = trivial), conversion happens at trip-start.
- **Tricount's "free, monetized via parent bank"** — not viable for an indie

**Recommended Divvy line:**
- **Free:** unlimited expenses & members, equal/exact/percentage splits, simplify debts, dark mode, **1–2 active groups**
- **Paid ($4.99 lifetime per device, OR $1.99 per-group one-time):** unlimited groups, recurring, receipts, CSV/PDF export, charts
- **Never paywall:** core split math, simplify debts, group size cap. That's the explicit anti-Splitwise positioning.

Realistic ARPU: **$0.30–$1.50** based on Splid/Settle Up disclosures.

---

## 8. Distribution & Growth

### ASO targets (high intent, indie-winnable)
- "splitwise alternative" (Reddit threads literally titled this)
- "split bills no ads" / "free splitwise"
- "trip expense tracker" / "roommate expenses"
- "no login bill split"

Apple now indexes screenshot caption text (since June 2025) and supports 70 custom product pages. Use captions as billboards: **"No 3-per-day limit." "No ads. Ever." "No login required."**

### Viral mechanics

**Share-link group join is the single biggest growth multiplier in this category.** Splid and Tricount both grow on it. Divvy's anonymous device-UUID model is *perfect* for this — no signup wall.

- One paying user → 4–6 free invitees per group
- Invitees later start their own group → conversion later
- Send-the-bill-via-link-to-non-users beats forcing everyone to install

Implement **Universal Links / App Links** for `divvy.app/g/{code}` that opens the app or a web fallback showing the group state.

### Reddit / TikTok formula that works
- Post in r/Splitwise, r/personalfinance, r/digitalnomad, r/solotravel framed as **"I built this because Splitwise added a 10-second timer."** This exact framing dominates the alt-Splitwise space.
- TikTok: "POV: Splitwise just locked your 4th expense of the day" reaction format.

---

## 9. Prioritized Roadmap

### V0.1 — Don't ship without these (1–2 weeks)
1. **Persist + reload groups on app start** (the disappearing-groups bug)
2. **Wire settle-up UI** — at minimum a "Mark settled" button per debt row in `GroupScreen`
3. **Switch to integer cents** throughout, top to bottom
4. **Lock down RTDB rules** to require member-UUID match
5. **Add Firebase Anonymous Auth** (no UX change — just get a stable UID)
6. **Try/catch around all `JSON.parse` and Firebase writes**
7. **Replace `paddingTop: 60`** with `useSafeAreaInsets()`
8. **Remove dead deps + dead currency LTL**
9. **Add `assets/` icons** + real Firebase config via Expo's `app.config.js` + `EXPO_PUBLIC_*` envs
10. **Tests for `balances.ts`** (10–15 cases covering split types, settle, edge cases)

### V1 — Launch-ready (3–6 weeks)
1. **Multi-currency with live FX** (e.g., open-rates API, daily snapshot) — biggest user-facing differentiator vs Splitwise free
2. **Recurring expenses** (rent/utilities) — drives monthly re-engagement
3. **Share-by-link group join** with Universal Links + web fallback page (huge growth lever)
4. **CSV/PDF export** — low effort, high "feels professional," Tricount got hammered for removing it
5. **Push notifications** — only for settle reminders, not activity-feed noise
6. **Onboarding flow** — 2 screens explaining how groups + simplify-debts work
7. **Percentage split UI** (the type/logic already exists, ship the button)
8. **Per-debt "remind via link" share-sheet** — a Splid trick that works
9. **IAP via RevenueCat** with the lifetime + per-group pricing experiment
10. **i18n + a11y labels** — table stakes for App Store editorial features

### V2 — Compounders (post-launch)
- Optional account upgrade (`linkWithCredential`) → cross-device sync
- Activity feed
- Receipt photo attach (skip OCR)
- Charts / spend-by-category
- Light Plaid integration (opt-in, only for power users) — risky, may break the "no account" pitch
- Web companion at `divvy.app/g/{code}` that shows balances without install

---

## 10. What NOT to Build (traps)

- **Receipt OCR** — flashy, used <5% of the time, expensive to do well. Allow photo attach instead.
- **Friends list / social graph** — Splitwise has it, nobody loves it. Per-group model wins.
- **Bank/Plaid integration** as a free-tier feature — kills the "no account" positioning, marginal lift.
- **Activity-feed notifications** before there's anything actually worth notifying about.
- **Native iOS / Android rewrite** — RN+Expo is a feature, not debt. The OSS cohort is mostly web-wrapped and feels like it.
- **Splitting by "shares" (Splitwise feature)** — power-user-only, adds UI complexity.
- **Friends-with-Splitwise import** — legal grey, brittle, support nightmare.

---

## 11. One-Sentence Positioning

> **The Splitwise you remember — no accounts, no ads, no daily limits, no 10-second timer.**

Every line of that is a direct quote from a 1-star review of the incumbent. That's the entire pitch. Build the V0.1 fixes, ship the V1 differentiators, hold the line on what you don't do.

---

## Appendix — Files essential to understanding the codebase

| File | Why it matters |
|---|---|
| `src/types/index.ts` | Canonical data model — read first |
| `src/firebase/db.ts` | All DB I/O |
| `src/firebase/config.ts` | Security posture (RTDB, not Firestore) |
| `src/hooks/useGroup.ts` | Only non-trivial hook; subscription + actions |
| `src/utils/balances.ts` | Core algorithm + the settle-skip bug |
| `src/store/localStore.ts` | Identity model — explains the no-Auth tradeoff |
| `src/screens/HomeScreen.tsx` | Contains the groups-don't-reload bug |
| `src/screens/AddExpenseScreen.tsx` | Most complex screen; split-type UI gap |
