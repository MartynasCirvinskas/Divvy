# 💸 Divvy — Split Expenses Fairly

> No accounts. No bank linking. Just share a 6-letter code.

A clean, minimal Splitwise alternative built with **React Native + Expo + Firebase**.

## Features

- 🤝 Create groups for trips, apartments, dinners — any shared expense
- 🔗 Invite friends via 6-letter code (no app account required)
- ➕ Add expenses with category, payer, and equal/custom splits
- ⚖️ Automatic balance calculation + debt minimization
- 💾 Real-time sync via Firebase (everyone sees updates instantly)
- 🌙 Dark/light mode
- 📳 Haptic feedback

## Screens

1. **Home** — your groups + create/join buttons
2. **Group** — expense list + simplified balance view
3. **Add Expense** — amount, description, category, paid by, split config

## Setup

### 1. Firebase (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable **Realtime Database** (test mode for first run)
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

Paste the contents of `firebase-rules.json` (created in Phase 1) into Firebase
console → Realtime Database → Rules. The shipped rules require Anonymous Auth
and bind read/write to group membership.

### 4. Quality scripts

| Command | What |
|---|---|
| `npm test` | Run unit tests once |
| `npm run test:watch` | Watch-mode |
| `npm run lint` | ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Prettier |
| `npm run typecheck` | `tsc --noEmit` |

## Monetization

- **Free:** up to 3 groups, basic splits
- **Pro ($2.99/mo):** unlimited groups, receipt scanning (ML Kit), export to CSV, multi-currency charts
- IAP via [RevenueCat](https://revenuecat.com)
- AdMob banner for free tier (optional)

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React Native 0.74 + Expo SDK 51 |
| Backend | Firebase Realtime Database |
| Navigation | React Navigation v6 |
| Storage | AsyncStorage (local profile) |
| Haptics | expo-haptics |
| Share | expo-clipboard + Share API |

## Architecture

```
src/
├── firebase/
│   ├── config.ts       # Firebase init (add your config here)
│   └── db.ts           # All DB read/write operations
├── hooks/
│   └── useGroup.ts     # Real-time group subscription
├── utils/
│   └── balances.ts     # Balance calc + debt minimization algorithm
├── screens/
│   ├── HomeScreen.tsx  # Groups list + create/join
│   ├── GroupScreen.tsx # Expenses + balances tabs
│   └── AddExpenseScreen.tsx
└── store/
    └── localStore.ts   # Anonymous device profile (AsyncStorage)
```

## License

MIT
