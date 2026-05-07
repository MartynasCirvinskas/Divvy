# 💸 Divvy — Split Expenses Fairly

> The Splitwise you remember — no accounts, no ads, no daily limits, no 10-second timer.

A clean, minimal Splitwise alternative built with **React Native + Expo + Firebase**.

## Features (V1)

- 🤝 **Groups by 6-letter code** — share a link, jump in, no signup
- ➕ **Equal / custom / percentage splits** — three ways to divide
- 💱 **Multi-currency with FX** — enter expenses in any currency; auto-converts to group currency
- 🔁 **Recurring expenses** — mark rent / utilities once; visual indicator in the list
- ⚖️ **Debt minimization** — fewest payments to settle the books
- ✅ **Per-debtor settle-up** — tap "Mark settled" on your own debt rows
- 🔗 **Share-by-link join** — `https://divvy.app/g/ABC234` opens the join modal
- 📤 **CSV export** — full expense history, sharable to email / Files / Drive
- 🌙 **Dark / light mode** + safe-area-aware layouts on every device
- 🔒 **Firebase Anonymous Auth** + member-bound RTDB rules (no wide-open data)
- 📳 **Haptics** on every success action

## Onboarding

A 3-page intro plus name capture greets first-time users — explains create / add / settle, sets up identity, then drops you into your group list.

## Setup

### 1. Firebase (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable **Realtime Database**
3. Authentication → Sign-in method → enable **Anonymous**
4. Project Settings → Add web app → copy the config object

### 2. Local environment

```bash
git clone https://github.com/MartynasCirvinskas/Divvy.git
cd Divvy
npm install
cp .env.example .env
# Fill in EXPO_PUBLIC_FIREBASE_* values from step 1
npx expo start
```

Press `a` for Android, `i` for iOS.

### 3. Database rules

Paste the contents of [`firebase-rules.json`](./firebase-rules.json) into
Firebase console → Realtime Database → Rules. The shipped rules require
Anonymous Auth and bind read/write to group membership.

### 4. Quality scripts

| Command | What |
|---|---|
| `npm test` | Run unit tests once (60+ tests) |
| `npm run test:watch` | Watch-mode |
| `npm run lint` | ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Prettier |
| `npm run typecheck` | `tsc --noEmit` |

## Monetization (planned)

- **Free:** unlimited expenses, equal/exact/percentage splits, simplify debts, dark mode, **1–2 active groups**
- **Paid ($4.99 lifetime per device):** unlimited groups, recurring auto-generation, receipts, charts
- **Never paywall:** core split math, simplify debts, group size cap. That's the explicit anti-Splitwise positioning.
- IAP via [RevenueCat](https://revenuecat.com)

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React Native 0.74 + Expo SDK 51 |
| Backend | Firebase Realtime Database + Anonymous Auth |
| Navigation | React Navigation v6 (with deep linking) |
| State | React Context (ProfileContext + GroupsContext) |
| Money | Integer cents end-to-end (no floats) |
| Storage | AsyncStorage (anonymous local profile) |

## Architecture

```
src/
├── contexts/
│   ├── ProfileContext.tsx   # Single source of truth for user profile
│   └── GroupsContext.tsx    # Cached group metadata (fixes restart bug)
├── firebase/
│   ├── config.ts            # Firebase init via expo-constants → app.config.js
│   └── db.ts                # All DB ops (atomic create, transactional settle)
├── hooks/
│   └── useGroup.ts          # Real-time group subscription + debt mapping
├── navigation/
│   └── AppNavigator.tsx     # Conditional Onboarding/Main stacks + linking
├── screens/
│   ├── HomeScreen.tsx       # Group list + create/join + deep-link handler
│   ├── GroupScreen.tsx      # Expense list, balances, settle-up, CSV export
│   ├── AddExpenseScreen.tsx # Multi-currency entry, splits, recurrence
│   └── OnboardingScreen.tsx # 3-page intro + name capture
├── store/
│   └── localStore.ts        # Anonymous profile + AsyncStorage migration
├── theme/                   # Color tokens + useThemeColors hook
└── utils/
    ├── money.ts             # toCents, parseAmountToCents, splitEqualCents, formatCents
    ├── balances.ts          # calculateBalances + simplifyDebts (per-debtor settled)
    ├── currency.ts          # SUPPORTED_CURRENCIES + convertCents (manual FX rates)
    ├── recurring.ts         # nextOccurrence, recurrenceLabel
    ├── csv.ts               # expensesToCsv (RFC4180 escaping)
    └── deeplink.ts          # groupShareUrl + parseJoinUrl
```

## Roadmap

### V1.5
- Push notifications for settle-up reminders
- IAP via RevenueCat (3-group free / lifetime tier)
- Live FX rates (cached daily) replacing the static `REFERENCE_RATES_USD` table
- i18n string extraction
- Accessibility-label sweep

### V2
- Server-side recurring expense generation (Firebase Cloud Function)
- Receipt photo attach (no OCR — keep it simple)
- Activity feed
- Charts / spend-by-category
- Web companion at `divvy.app/g/{code}` for non-installers

## License

MIT
