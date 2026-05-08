# Divvy V2 Plan — Hardening + First Multi-Tool Feature

> **Execution mode:** Ralph Loop, autonomous. Each iteration re-reads this file.
> **Completion:** all checkboxes ticked AND `npm run typecheck && npm test && npm run lint` clean → emit `<promise>DIVVY V2A SHIPPABLE</promise>`.
> **Repo root:** `C:\Users\marty\OneDrive\Desktop\Agents\Idea_Executor\Divvy`

**Scope:** Phase A (V1 perf + correctness hardening discovered during emulator testing) → Phase B (Game Scoring module — the strongest V2 differentiator per `V2_STRATEGY.md` since every existing score-tracker app is single-device pass-around). If time remains: Phase C (Birthday wishlist).

**Out of scope** (do NOT touch):
- IAP / RevenueCat / paywall — user explicitly deferring monetization until there's a customer base
- Apple Developer setup / iOS-specific code — Android-only for now
- Cloud Functions (would need Firebase Blaze plan upgrade — user action required)
- Real artwork (placeholders are fine until launch)
- Secret Santa (defer to V2.5 — only meaningful Nov-Dec)
- Anything requiring user interaction at the Firebase console

---

## Ralph Operating Rules

1. **Read this file fully each iteration.** Find next unchecked `- [ ]`, work it, tick it.
2. **One task at a time, commit after each.** Conventional messages: `fix:`, `feat:`, `chore:`, `test:`, `refactor:`, `perf:`.
3. **Run gates before each commit:** `npx tsc --noEmit` (0 errors), `npm test` (all green), `npm run lint` (0 errors). If any fails, fix before moving on.
4. **No `git push`, no PRs, no destructive git ops.** Local commits only.
5. **If a step is ambiguous, read the actual file via Read tool first.** Don't trust prior snapshots blindly.
6. **If something requires the user (Firebase console action, real device, IAP setup, etc) — log it in `USER_TODO.md`** instead of attempting it. Append; don't overwrite.
7. **When ALL boxes checked + gates green:** emit `<promise>DIVVY V2A SHIPPABLE</promise>`. Not before.

---

# PHASE A — V1 Hardening (perf + correctness)

These came from emulator testing on May 7-8, 2026. They're real issues found by running the actual app, not theoretical.

## Task A.1 — Extract `stripUndefined` to utils + tests

The fix for the "set failed: value argument contains undefined" RTDB error currently lives as a private helper in `src/firebase/db.ts`. Extract to its own util with unit tests so it can't regress and so other callers can use it.

**Files:**
- Create: `src/utils/firebase-safe.ts`
- Create: `src/utils/__tests__/firebase-safe.test.ts`
- Modify: `src/firebase/db.ts` (remove inline helper, import from utils)

- [x] **Step 1:** Write the failing tests at `src/utils/__tests__/firebase-safe.test.ts`:

```ts
import { stripUndefined } from '../firebase-safe';

describe('stripUndefined', () => {
  it('removes top-level undefined keys', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });
  it('keeps null values (different from undefined)', () => {
    expect(stripUndefined({ a: null, b: undefined })).toEqual({ a: null });
  });
  it('keeps empty string and zero (truthy/falsy not relevant)', () => {
    expect(stripUndefined({ a: '', b: 0, c: false })).toEqual({ a: '', b: 0, c: false });
  });
  it('recurses into nested objects', () => {
    expect(stripUndefined({ outer: { a: 1, b: undefined } })).toEqual({ outer: { a: 1 } });
  });
  it('recurses into arrays', () => {
    expect(stripUndefined([{ a: 1, b: undefined }, 2, 3])).toEqual([{ a: 1 }, 2, 3]);
  });
  it('passes primitives through unchanged', () => {
    expect(stripUndefined(42)).toBe(42);
    expect(stripUndefined('hi')).toBe('hi');
    expect(stripUndefined(null)).toBe(null);
  });
  it('handles deeply nested mixed structures', () => {
    const input = {
      group: {
        members: { a: { id: 'a', deleted: undefined } },
        expenses: { e1: { amountCents: 100, customAmounts: undefined } },
      },
    };
    const expected = {
      group: {
        members: { a: { id: 'a' } },
        expenses: { e1: { amountCents: 100 } },
      },
    };
    expect(stripUndefined(input)).toEqual(expected);
  });
});
```

- [x] **Step 2:** Confirmed FAIL: `Cannot find module '../firebase-safe'`.

- [x] **Step 3:** Create `src/utils/firebase-safe.ts`:

```ts
/**
 * Recursively remove `undefined` values from an object before sending to
 * Firebase. RTDB's serializer rejects writes containing `undefined`, but JS
 * allows `undefined` as the value of optional object properties. RTDB treats
 * a missing key the same as a key set to `undefined` would have meant, so
 * stripping is safe and equivalent.
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out as T;
}
```

- [x] **Step 4:** Updated `db.ts` — removed inline helper, imported from `../utils/firebase-safe`.
- [x] **Step 5:** Tests 64/64, typecheck 0, lint 0.
- [x] **Step 6:** Commit: `refactor(firebase): extract stripUndefined to utils with tests`.

## Task A.2 — Optimistic profile update in `ProfileContext.addGroup`

When the user creates/joins a group, `ProfileContext.addGroup` calls `persistAddGroup` (AsyncStorage write) then `await reload()` which re-runs ensureAnonAuth + getOrCreateProfile. That's slow. Since we already know what changed (one new group ID), update the React state in-place and let persistence happen separately.

**Files:**
- Modify: `src/contexts/ProfileContext.tsx`

- [x] **Step 1:** Open `src/contexts/ProfileContext.tsx`, read it fully.

- [x] **Step 2:** Replaced `addGroup` to do persistAddGroup + optimistic setProfile update (no reload):

```ts
const addGroup = useCallback(
  async (groupId: string) => {
    // Persist to AsyncStorage in the background; don't block UI.
    await persistAddGroup(groupId);
    // Update local state in-place rather than calling reload() (which would
    // re-run anon auth + AsyncStorage read + trigger GroupsContext refresh).
    setProfile((p) => {
      if (!p) return p;
      if (p.joinedGroups.includes(groupId)) return p;
      return { ...p, joinedGroups: [...p.joinedGroups, groupId] };
    });
  },
  [],
);
```

- [x] **Step 3:** Same pattern for `removeGroup`:

```ts
const removeGroup = useCallback(
  async (groupId: string) => {
    await persistRemoveGroup(groupId);
    setProfile((p) => {
      if (!p) return p;
      return { ...p, joinedGroups: p.joinedGroups.filter((id) => id !== groupId) };
    });
  },
  [],
);
```

- [x] **Step 4:** Gates pass — useGroups still triggers via profile useEffect because `setProfile` returns a new object reference.
- [x] **Step 5:** Commit: `perf(profile): optimistic state update in addGroup/removeGroup`.

## Task A.3 — Selective `GroupsContext.refresh` (delta-only fetch)

Currently `GroupsContext.refresh` re-fetches metadata for *every* `joinedGroup` whenever profile changes. That's O(N) network calls per create. Make it skip groups already in state.

**Files:**
- Modify: `src/contexts/GroupsContext.tsx`

- [x] **Step 1:** Read GroupsContext.tsx fully.
- [x] **Step 2:** Updated `refresh` to compute delta vs known IDs, only fetch missing, drop left groups:

```ts
const refresh = useCallback(async () => {
  if (!profile) return;
  setLoading(true);
  try {
    setGroups((existing) => {
      const knownIds = new Set(existing.map((g) => g.id));
      const missing = profile.joinedGroups.filter((id) => !knownIds.has(id));
      // Drop groups the user has left
      const stillJoined = new Set(profile.joinedGroups);
      const kept = existing.filter((g) => stillJoined.has(g.id));
      // Fire-and-forget fetch for missing IDs; resolved updates go via setGroups again
      if (missing.length > 0) {
        void Promise.all(missing.map(getGroupMeta)).then((fetched) => {
          const valid = fetched.filter((g): g is GroupMeta => g !== null);
          setGroups((prev) => {
            const map = new Map<string, GroupMeta>();
            [...prev, ...valid].forEach((g) => map.set(g.id, g));
            return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          });
        });
      }
      return kept.sort((a, b) => b.createdAt - a.createdAt);
    });
  } catch (e) {
    console.error('[groups] refresh failed', e);
  } finally {
    setLoading(false);
  }
}, [profile]);
```

- [x] **Step 3:** Gates pass. Trace verified: addLocally adds new group, profile updates, refresh sees the ID already in state → missingIds empty → no extra fetch.
- [x] **Step 4:** Commit: `perf(groups): refresh fetches only delta, not all known groups`.

## Task A.4 — Push notifications scaffold (foundation for V2 features)

Game scoring doesn't strictly need notifications, but birthday reminders and Secret Santa do. Wiring this now means later features inherit it cleanly. Keep it Android-only for now per scope.

**Files:**
- Modify: `package.json` (re-add `expo-notifications`, `expo-device`)
- Create: `src/notifications/index.ts`
- Modify: `App.tsx` (initialize permissions on launch)
- Modify: `app.config.js` (re-add `POST_NOTIFICATIONS` permission)
- Append: `USER_TODO.md`

- [x] **Step 1:** Installed `expo-notifications@~0.28.19` + `expo-device@~6.0.2`.

```bash
npm install expo-notifications@~0.28.19 expo-device@~6.0.2
```

- [x] **Step 2:** Create `src/notifications/index.ts` (note: SDK 51's expo-notifications uses `{ trigger: { date } }` rather than `SchedulableTriggerInputTypes.DATE`):

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permission and (if granted) return the Expo push token
 * so the server can target this device. For V2A this is local-schedule only;
 * remote push via FCM requires google-services.json + the Expo project's
 * push credentials configured (see USER_TODO.md).
 */
export async function ensureNotificationPermission(): Promise<string | null> {
  if (!Device.isDevice) return null; // emulator/simulator: skip remote token
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.warn('[notifications] failed to get push token', e);
    return null;
  }
}

/** Schedule a local notification at a specific timestamp. Used for in-app
 *  reminders that don't need a server (e.g. settle-up nudges, birthday
 *  reminders set on this device). */
export async function scheduleLocal(opts: {
  title: string;
  body: string;
  date: Date;
  data?: Record<string, unknown>;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: opts.title, body: opts.body, data: opts.data ?? {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: opts.date },
  });
}

export async function cancelScheduled(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}
```

- [x] **Step 3:** Added `POST_NOTIFICATIONS` to `app.config.js` android.permissions.

```js
android: {
  // ... existing fields ...
  permissions: ['VIBRATE', 'POST_NOTIFICATIONS'],
  // ... existing intentFilters ...
},
```

- [x] **Step 4:** Updated `App.tsx` to call `ensureNotificationPermission()` once via useEffect.

```tsx
// near other imports
import { useEffect } from 'react';
import { ensureNotificationPermission } from './src/notifications';

// inside App component, before the providers:
useEffect(() => {
  // Fire-and-forget; failure is fine (permission denied = no notifications,
  // but app still works for everything else).
  ensureNotificationPermission().catch(() => {});
}, []);
```

- [x] **Step 5:** Appended FCM/google-services.json setup section to `USER_TODO.md`.

```markdown
### Push notifications (V2 features)

The local notification scaffold is installed. For **remote push** (Secret
Santa "your draw is ready", birthday reminders sent server-side), you'll
need:

1. **Firebase Cloud Messaging (FCM) service account JSON.**
   Firebase console → Project Settings → Cloud Messaging tab → "Manage
   service accounts" → generate a key → download the JSON.
2. **Upload to EAS (when you set up cloud builds):**
   `eas credentials` → Android → set FCM service account.
3. **OR** for local builds: download `google-services.json` from Firebase
   console → Project Settings → "Your apps" → Android app → save to
   `android/app/google-services.json` (gitignored).

Local scheduled notifications (birthday reminders set on the user's own
device, settle-up nudges) work without any of the above.
```

- [x] **Step 6:** Tests 64/64, typecheck 0, lint 0.
- [x] **Step 7:** Commit: `feat(notifications): scaffold expo-notifications + permission flow`.

## Task A.5 — Phase A verify

- [x] **Step 1:** Typecheck 0, tests 64/64, lint exit 0.
- [x] **Step 2:** Commit: `chore: Phase A verify (perf + notifications scaffold)`.

---

# PHASE B — Game Scoring Module

Highest-value V2 feature per `V2_STRATEGY.md`: every existing score-tracker (BG Stats, Scory, Tally, Score Anything) assumes one device passed around. Divvy's join-code primitive lets every member join the same scoreboard from their own phone — genuinely differentiated.

**Goal:** generic point tracker. User starts a "session" in a group, picks high-wins or low-wins, adds participants (any group member or ad-hoc team strings), and everyone sees a live scoreboard. Tap +/- to adjust scores. End the session to mark a winner.

**Scope decision:** generic V1 first. Game-specific templates (Alias rounds, Catan victory points, poker chips) are V3+.

## Task B.1 — Game session types

**Files:**
- Modify: `src/types/index.ts`

- [x] **Step 1:** Added `ScoringDirection` + `GameSession` to types/index.ts.

```ts
export type ScoringDirection = 'high-wins' | 'low-wins';

export interface GameSession {
  id: string;
  groupId: string;
  name: string;
  scoringDirection: ScoringDirection;
  /** Member ids OR free-form team strings (e.g. "Team Alpha"). Free-form
   *  strings are prefixed with `team:` so they can't collide with member ids. */
  participants: string[];
  /** Map participant id → integer score. Stored as integer (multiply external
   *  fractional inputs by 100 if you ever need decimals — for V1 we assume int). */
  scores: Record<string, number>;
  createdAt: number;
  endedAt?: number;
  /** Winner id, computed and stored on session end. */
  winnerId?: string;
  createdByDeviceId: string;
}
```

- [x] **Step 2:** Typecheck 0.
- [x] **Step 3:** Commit: `feat(types): add GameSession + ScoringDirection`.

## Task B.2 — Pure scoring math + tests

**Files:**
- Create: `src/utils/scoring.ts`
- Create: `src/utils/__tests__/scoring.test.ts`

- [x] **Step 1:** Wrote 10 tests for computeWinner + team labels.

```ts
import { computeWinner, isParticipantTeam, teamLabel } from '../scoring';

describe('scoring', () => {
  describe('computeWinner', () => {
    it('high-wins: returns participant with highest score', () => {
      expect(
        computeWinner({ a: 10, b: 25, c: 15 }, 'high-wins'),
      ).toBe('b');
    });
    it('low-wins: returns participant with lowest score', () => {
      expect(
        computeWinner({ a: 10, b: 25, c: 15 }, 'low-wins'),
      ).toBe('a');
    });
    it('returns first tied participant deterministically (insertion order)', () => {
      expect(
        computeWinner({ a: 10, b: 10, c: 5 }, 'high-wins'),
      ).toBe('a');
    });
    it('returns null for empty scores', () => {
      expect(computeWinner({}, 'high-wins')).toBeNull();
    });
  });

  describe('team labels', () => {
    it('isParticipantTeam recognizes team: prefix', () => {
      expect(isParticipantTeam('team:Alpha')).toBe(true);
      expect(isParticipantTeam('member-uid-123')).toBe(false);
    });
    it('teamLabel strips the prefix', () => {
      expect(teamLabel('team:Alpha')).toBe('Alpha');
      expect(teamLabel('team:Team A')).toBe('Team A');
    });
  });
});
```

- [x] **Step 2:** Implemented `src/utils/scoring.ts` (computeWinner, isParticipantTeam, teamLabel, makeTeamId).

```ts
import { ScoringDirection } from '../types';

const TEAM_PREFIX = 'team:';

export function isParticipantTeam(id: string): boolean {
  return id.startsWith(TEAM_PREFIX);
}

export function teamLabel(id: string): string {
  return isParticipantTeam(id) ? id.slice(TEAM_PREFIX.length) : id;
}

export function makeTeamId(name: string): string {
  return `${TEAM_PREFIX}${name}`;
}

/**
 * Determine the winner of a session based on scoring direction.
 * Ties resolved by insertion order (first-tied wins) — deterministic and
 * sufficient for V1; group can manually override via UI later.
 */
export function computeWinner(
  scores: Record<string, number>,
  direction: ScoringDirection,
): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  let winner = entries[0][0];
  let winningScore = entries[0][1];
  for (let i = 1; i < entries.length; i++) {
    const [id, score] = entries[i];
    const isBetter = direction === 'high-wins' ? score > winningScore : score < winningScore;
    if (isBetter) {
      winner = id;
      winningScore = score;
    }
  }
  return winner;
}
```

- [x] **Step 3:** All 74 tests pass.
- [x] **Step 4:** Commit: `feat(scoring): pure scoring math + 10 tests`.

## Task B.3 — Game session DB layer

**Files:**
- Modify: `src/firebase/db.ts`

- [x] **Step 1:** Added 6 game session ops to db.ts: createGameSession, deleteGameSession, adjustScore (transactional), endGameSession, subscribeToGameSession, subscribeToGameSessions.

```ts
import { GameSession } from '../types';
// (add to existing imports if not already there)

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
```

- [x] **Step 2:** Typecheck 0, tests 74/74, lint 0.
- [x] **Step 3:** Commit: `feat(db): game session CRUD + atomic score updates`.

## Task B.4 — `useGameSession` hook

**Files:**
- Create: `src/hooks/useGameSession.ts`

- [x] **Step 1:** Created `src/hooks/useGameSession.ts` with subscribe + adjust + end + delete actions.

```ts
import { useState, useEffect, useCallback } from 'react';
import { GameSession } from '../types';
import {
  subscribeToGameSession,
  adjustScore,
  endGameSession,
  deleteGameSession,
} from '../firebase/db';
import { computeWinner } from '../utils/scoring';

export function useGameSession(groupId: string, sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToGameSession(groupId, sessionId, (s) => {
      setSession(s);
      setLoading(false);
    });
    return unsub;
  }, [groupId, sessionId]);

  const handleAdjust = useCallback(
    async (participantId: string, delta: number) => {
      if (!sessionId) return;
      await adjustScore(groupId, sessionId, participantId, delta);
    },
    [groupId, sessionId],
  );

  const handleEnd = useCallback(async () => {
    if (!sessionId || !session) return;
    const winner = computeWinner(session.scores ?? {}, session.scoringDirection);
    if (!winner) return;
    await endGameSession(groupId, sessionId, winner);
  }, [groupId, sessionId, session]);

  const handleDelete = useCallback(async () => {
    if (!sessionId) return;
    await deleteGameSession(groupId, sessionId);
  }, [groupId, sessionId]);

  return { session, loading, adjust: handleAdjust, end: handleEnd, deleteSession: handleDelete };
}
```

- [x] **Step 2:** Typecheck 0.
- [x] **Step 3:** Commit: `feat(hook): useGameSession with live subscription + actions`.

## Task B.5 — `useGameSessions` list hook

**Files:**
- Create: `src/hooks/useGameSessions.ts`
- Modify: `src/firebase/db.ts` (add list subscription)

- [x] **Step 1:** subscribeToGameSessions already added to db.ts in Task B.3.

```ts
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
```

- [x] **Step 2:** Created `src/hooks/useGameSessions.ts` for live list of all sessions in a group.

```ts
import { useState, useEffect } from 'react';
import { GameSession } from '../types';
import { subscribeToGameSessions } from '../firebase/db';

export function useGameSessions(groupId: string) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToGameSessions(groupId, (s) => {
      setSessions(s);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  return { sessions, loading };
}
```

- [x] **Step 3:** Typecheck 0, tests 74/74.
- [x] **Step 4:** Commit: `feat(hook): useGameSessions list subscription`.

## Task B.6 — `NewGameScreen` — session config UI

**Files:**
- Create: `src/screens/NewGameScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (add route)

- [x] **Step 1:** Added `NewGame` and `GameSession` to `RootStackParamList` in AppNavigator.

```ts
export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string };
  AddExpense: { groupId: string; expenseId?: string };
  NewGame: { groupId: string };
  GameSession: { groupId: string; sessionId: string };
};
```

- [x] **Step 2:** Created `src/screens/NewGameScreen.tsx` with name, scoring direction, member chips, team-input + chips, and validation (≥2 participants, name required).

```tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { GameSession, ScoringDirection } from '../types';
import { useGroup } from '../hooks/useGroup';
import { useProfile } from '../contexts/ProfileContext';
import { createGameSession } from '../firebase/db';
import { makeTeamId } from '../utils/scoring';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewGame'>;
  route: RouteProp<RootStackParamList, 'NewGame'>;
};

export function NewGameScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { group } = useGroup(groupId);
  const { profile } = useProfile();

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<ScoringDirection>('high-wins');
  const [participants, setParticipants] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState('');
  const [saving, setSaving] = useState(false);

  const members = Object.values(group?.members ?? {});

  const toggleMember = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const addTeam = () => {
    const trimmed = teamInput.trim();
    if (!trimmed) return;
    const id = makeTeamId(trimmed);
    if (!participants.includes(id)) {
      setParticipants((p) => [...p, id]);
    }
    setTeamInput('');
  };

  const removeTeam = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p !== id));
  };

  const handleStart = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the game a name.');
      return;
    }
    if (participants.length < 2) {
      Alert.alert('Need at least 2 participants');
      return;
    }
    if (!profile) return;
    setSaving(true);
    try {
      const initialScores: Record<string, number> = {};
      participants.forEach((id) => { initialScores[id] = 0; });
      const session: GameSession = {
        id: uuidv4(),
        groupId,
        name: name.trim(),
        scoringDirection: direction,
        participants,
        scores: initialScores,
        createdAt: Date.now(),
        createdByDeviceId: profile.deviceId,
      };
      await createGameSession(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('GameSession', { groupId, sessionId: session.id });
    } catch (e) {
      console.error('[new-game]', e);
      Alert.alert('Could not start', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.onBackground }]}>New Game</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Name</Text>
        <TextInput
          style={[styles.input, { color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
          placeholder="e.g. Catan, Alias night"
          placeholderTextColor={theme.onSurfaceVariant}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Scoring</Text>
        <View style={styles.row}>
          {(['high-wins', 'low-wins'] as ScoringDirection[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.optBtn,
                { borderColor: theme.border },
                direction === d && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
              ]}
              onPress={() => setDirection(d)}
            >
              <Text style={[styles.optText, { color: direction === d ? COLORS.primary : theme.onSurface }]}>
                {d === 'high-wins' ? '⬆️ Most points wins' : '⬇️ Fewest points wins'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Members</Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.chip,
                { borderColor: theme.border },
                participants.includes(m.id) && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
              ]}
              onPress={() => toggleMember(m.id)}
            >
              <Text style={[styles.chipText, { color: participants.includes(m.id) ? COLORS.primary : theme.onSurface }]}>
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Or add teams</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="Team name"
            placeholderTextColor={theme.onSurfaceVariant}
            value={teamInput}
            onChangeText={setTeamInput}
            onSubmitEditing={addTeam}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addTeam}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          {participants.filter((p) => p.startsWith('team:')).map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.chip, { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary }]}
              onPress={() => removeTeam(id)}
            >
              <Text style={[styles.chipText, { color: COLORS.primary }]}>
                {id.slice(5)} ✕
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.startBtn, (saving || !name.trim() || participants.length < 2) && { opacity: 0.5 }]}
        onPress={handleStart}
        disabled={saving || !name.trim() || participants.length < 2}
      >
        <Text style={styles.startBtnText}>{saving ? 'Starting…' : '▶ Start Game'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 8 },
  optBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  optText: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  startBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
```

- [x] **Step 3:** Wired into AppNavigator (also wired GameSessionScreen here together since the navigator imports both).
- [x] **Step 4:** Typecheck 0, lint 0.
- [x] **Step 5:** Commit: `feat(games): NewGameScreen — session config UI`.

## Task B.7 — `GameSessionScreen` — live scoreboard

**Files:**
- Create: `src/screens/GameSessionScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

- [x] **Step 1:** Created `src/screens/GameSessionScreen.tsx` — live scoreboard, sorted by score (best first per scoring direction), per-row +/- 1 / +5 buttons, end + delete actions, post-end winner banner.

```tsx
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useGameSession } from '../hooks/useGameSession';
import { isParticipantTeam, teamLabel, computeWinner } from '../utils/scoring';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameSession'>;
  route: RouteProp<RootStackParamList, 'GameSession'>;
};

export function GameSessionScreen({ navigation, route }: Props) {
  const { groupId, sessionId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { group } = useGroup(groupId);
  const { session, loading, adjust, end, deleteSession } = useGameSession(groupId, sessionId);

  if (loading || !session) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const labelFor = (id: string): string => {
    if (isParticipantTeam(id)) return teamLabel(id);
    return group?.members[id]?.name ?? '?';
  };

  const handleAdjust = async (participantId: string, delta: number) => {
    Haptics.selectionAsync();
    try {
      await adjust(participantId, delta);
    } catch (e) {
      console.error('[adjust-score]', e);
    }
  };

  const handleEnd = () => {
    const winner = computeWinner(session.scores ?? {}, session.scoringDirection);
    if (!winner) {
      Alert.alert('No winner', 'Add some scores first.');
      return;
    }
    Alert.alert(
      'End game?',
      `Winner: ${labelFor(winner)} with ${session.scores[winner]} points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await end();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) { console.error('[end-game]', e); }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete game?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSession();
            navigation.goBack();
          } catch (e) { console.error('[delete-game]', e); }
        },
      },
    ]);
  };

  // Sort participants by current score (best first based on direction)
  const sorted = [...session.participants].sort((a, b) => {
    const sa = session.scores[a] ?? 0;
    const sb = session.scores[b] ?? 0;
    return session.scoringDirection === 'high-wins' ? sb - sa : sa - sb;
  });

  const winner = session.endedAt
    ? session.winnerId
    : computeWinner(session.scores ?? {}, session.scoringDirection);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.onBackground }]} numberOfLines={1}>{session.name}</Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {session.scoringDirection === 'high-wins' ? 'Most points wins' : 'Fewest points wins'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Text style={[styles.iconBtnText, { color: COLORS.danger }]}>🗑</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {sorted.map((p, i) => {
          const isWinner = p === winner;
          return (
            <View
              key={p}
              style={[
                styles.row,
                {
                  backgroundColor: theme.card,
                  borderColor: isWinner ? COLORS.primary : theme.border,
                  borderWidth: isWinner ? 2 : 1.5,
                },
              ]}
            >
              <Text style={[styles.rank, { color: theme.onSurfaceVariant }]}>{i + 1}</Text>
              <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
                {isWinner && !session.endedAt ? '👑 ' : ''}{labelFor(p)}
              </Text>
              <Text style={[styles.score, { color: COLORS.primary }]}>
                {session.scores[p] ?? 0}
              </Text>
              {!session.endedAt && (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                    onPress={() => handleAdjust(p, -1)}
                  >
                    <Text style={[styles.adjText, { color: theme.onSurface }]}>−1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }]}
                    onPress={() => handleAdjust(p, 1)}
                  >
                    <Text style={[styles.adjText, { color: COLORS.primary }]}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }]}
                    onPress={() => handleAdjust(p, 5)}
                  >
                    <Text style={[styles.adjText, { color: COLORS.primary }]}>+5</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {!session.endedAt ? (
        <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End Game</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.endedBanner, { backgroundColor: COLORS.primaryBg }]}>
          <Text style={[styles.endedText, { color: COLORS.primary }]}>
            🏆 {labelFor(session.winnerId ?? '')} won
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  iconBtn: { paddingHorizontal: 8 },
  iconBtnText: { fontSize: 18 },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  rank: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  score: { fontSize: 22, fontWeight: '800', minWidth: 50, textAlign: 'right' },
  btnRow: { flexDirection: 'row', gap: 4 },
  adjBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  adjText: { fontSize: 13, fontWeight: '700' },
  endBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  endedBanner: {
    margin: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  endedText: { fontSize: 16, fontWeight: '800' },
});
```

- [x] **Step 2:** Added GameSessionScreen import + route to AppNavigator (done together with NewGame in Task B.6).
- [x] **Step 3:** Typecheck 0, lint 0.
- [x] **Step 4:** Commit: `feat(games): GameSessionScreen — live scoreboard with +/- buttons`.

## Task B.8 — Wire game module into `GroupScreen`

**Files:**
- Modify: `src/screens/GroupScreen.tsx`

- [x] **Step 1:** Wired games tab into GroupScreen with useGameSessions, FlatList rendering session cards (🎲 in-progress / 🏆 finished with winner name), context-sensitive FAB (Add Expense on expenses tab, New Game on games tab, none on balances). Empty state: "No games yet. Start one for your next game night!"

  Replace the `Tab` type:
  ```ts
  type Tab = 'expenses' | 'balances' | 'games';
  ```

  In the tabs row, add:
  ```tsx
  <TouchableOpacity
    style={[styles.tab, tab === 'games' && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
    onPress={() => setTab('games')}
  >
    <Text style={[styles.tabText, { color: tab === 'games' ? COLORS.primary : theme.onSurfaceVariant }]}>
      🎲 Games
    </Text>
  </TouchableOpacity>
  ```

  Add new `useGameSessions` hook usage near top of component:
  ```ts
  import { useGameSessions } from '../hooks/useGameSessions';
  // ... inside component:
  const { sessions: gameSessions } = useGameSessions(groupId);
  ```

  Add render logic in the existing tab switch — handle `tab === 'games'` with a FlatList that maps `gameSessions` to rows showing name + status (in-progress / winner) + tap navigates to `GameSession` route.

  Replace the floating "+ Add Expense" FAB to be context-sensitive: when on `expenses` tab → "+ Add Expense", when on `games` tab → "+ New Game" (navigates to `NewGame`), when on `balances` tab → no FAB.

- [x] **Step 2:** Typecheck 0, tests 74/74, lint 0. Manual smoke test in USER_TODO.
- [x] **Step 3:** Commit: `feat(group): wire Games tab + new-game FAB`.

## Task B.9 — Phase B verify + emulator smoke test

- [x] **Step 1:** Typecheck 0, tests 74/74, lint 0.

- [x] **Step 2:** Appended Game Scoring smoke test instructions to `USER_TODO.md`.

```markdown
### V2 Game Scoring — manual smoke test on emulator

After the Ralph run completes, run on emulator:

1. Make sure `Divvy_Pixel` AVD is running (`emulator -avd Divvy_Pixel`)
2. From the project root: `npm run android` (~1-2 min)
3. Test the new flow:
   - Open a group → tap "🎲 Games" tab
   - Tap "+ New Game"
   - Enter "Catan", pick "Most points wins", select yourself + add a team "Reds"
   - Tap "Start Game"
   - On the live scoreboard: tap +1, +5, -1 buttons
   - Tap "End Game" → confirm
   - Verify winner banner shows
   - Tap back → see session in the Games tab list with "🏆 winner" indicator

If anything looks wrong, check `adb logcat -d -t 100 ReactNativeJS:* "*:S"`.
```

- [x] **Step 3:** Commit: `chore: Phase B verify (game scoring shippable)`.

---

# PHASE C — Birthday Wishlist (only if time remains)

This is bonus scope. If Ralph hits iteration limits or runs into blockers, stop after Phase B and emit the completion promise.

## Task C.1 — Wishlist types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1:** Add types:

```ts
export interface WishItem {
  id: string;
  title: string;
  url?: string;
  priceCents?: number;
  createdAt: number;
}

export interface WishItemClaim {
  itemId: string;
  claimedBy: string;  // memberId
  claimedAt: number;
}

export interface MemberBirthday {
  memberId: string;
  /** "MM-DD" format. Optional — not all members provide it. */
  birthday?: string;
}
```

Also add to `Member`:
```ts
export interface Member {
  id: string;
  name: string;
  joinedAt: number;
  /** "MM-DD" — optional, used for birthday reminders. */
  birthday?: string;
}
```

- [ ] **Step 2:** Run typecheck.
- [ ] **Step 3:** Commit: `feat(types): wishlist + claims + member birthday`.

## Task C.2 — Wishlist DB ops with split-path privacy

**Files:**
- Modify: `src/firebase/db.ts`

- [ ] **Step 1:** Add ops at the bottom of `db.ts`:

```ts
import { WishItem, WishItemClaim } from '../types';

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
  // Also clear any claim on it
  await update(ref(db), {
    [`groups/${groupId}/wishlists/${ownerMemberId}/items/${itemId}`]: null,
    [`groups/${groupId}/wishlists/${ownerMemberId}/claims/${itemId}`]: null,
  });
}

/**
 * Claims live in a separate path so the owner CAN'T see who claimed an item
 * (preserves the gift surprise). RTDB rules should restrict /claims/* to be
 * unreadable by the wishlist owner.
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
```

- [ ] **Step 2:** Append to `USER_TODO.md`:

```markdown
### Wishlist privacy — RTDB rules update needed

The wishlist feature uses split-path privacy: items live at
`/groups/$id/wishlists/$ownerId/items/$itemId` (public to group), but claims
live at `/groups/$id/wishlists/$ownerId/claims/$itemId` and must be invisible
to the wishlist owner (so they don't see who's getting them what).

Update `firebase-rules.json` to add (then paste into Firebase console):

\`\`\`json
"wishlists": {
  "$ownerId": {
    "items": {
      ".read": "auth != null && root.child('groups').child($groupId).child('members').child(auth.uid).exists()",
      ".write": "auth != null && auth.uid == $ownerId"
    },
    "claims": {
      "$itemId": {
        ".read": "auth != null && auth.uid != $ownerId && root.child('groups').child($groupId).child('members').child(auth.uid).exists()",
        ".write": "auth != null && auth.uid != $ownerId && root.child('groups').child($groupId).child('members').child(auth.uid).exists()"
      }
    }
  }
}
\`\`\`

(The exact rules need refinement — claims should also be readable by the
claimer themselves so they can see what they've claimed. Test in the Firebase
Rules Playground before publishing.)
```

- [ ] **Step 3:** Run gates.
- [ ] **Step 4:** Commit: `feat(db): wishlist ops with split-path privacy`.

## Task C.3 — Phase C UI (basic, time-permitting)

If Ralph reaches this point with iteration budget remaining: build a minimal `WishlistScreen` accessed from the Group screen. Otherwise, skip — leave the data layer + USER_TODO note and let a follow-up plan finish the UI.

- [ ] **Step 1:** [Skipped if iterations running low] Build `WishlistScreen.tsx` showing:
  - Each member's name as a section header
  - Their items as rows
  - Claim/unclaim button per item (only visible if not your own wishlist)
  - "Add to my wishlist" button at the bottom (only when viewing your own)
- [ ] **Step 2:** Wire from GroupScreen.
- [ ] **Step 3:** Commit: `feat(wishlist): minimal screen for adding + claiming`.

---

# Completion Gate

When **every** checkbox in Phase A and Phase B is `[x]` (Phase C is bonus, not required):

1. Run `npx tsc --noEmit && npm test && npm run lint` — all clean.
2. Verify `USER_TODO.md` exists at repo root and lists the manual steps the user needs to do.
3. Output exactly:

```
<promise>DIVVY V2A SHIPPABLE</promise>
```

Do NOT emit before then. If a task can't be completed, log why in `USER_TODO.md` and continue to the next task — partial progress beats blocked progress.
