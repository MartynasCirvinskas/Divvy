# Wishlist UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the per-member wishlist UI inside Divvy groups: members add wishes, others claim them privately, birthdays surface for context. Owner-can't-see-claimers privacy preserved at the client layer (RTDB rules update tracked separately in `USER_TODO.md`).

**Architecture:** New 4th tab `🎁 Wishes` on `GroupScreen`. Tab content = members list (`WishlistMembersList`). Tap a member → `WishlistDetailScreen` with that person's items + claim affordances (or own list + add affordance). Birthday entry inline on own detail screen. New navigated route `AddWishItem` modal. Two pure utils (birthday math, owner-claim privacy filter) backed by Jest unit tests.

**Tech Stack:** React Native 0.74, Expo SDK 51, Firebase RTDB, TypeScript. New native dep: `@react-native-community/datetimepicker@8.0.1` (Expo SDK 51 compatible, requires `npm run android` rebuild).

**Spec reference:** `docs/superpowers/specs/2026-05-09-wishlist-ui-design.md`

**Repo root:** `C:\Users\marty\OneDrive\Desktop\Agents\Idea_Executor\Divvy`

**Gates between every commit:** `npx tsc --noEmit` (0 errors), `npm test` (all green), `npm run lint` (0 errors).

---

## Task 1: Install date picker dependency

**Files:**
- Modify: `package.json` (npm install adds the entry)

- [ ] **Step 1: Install the SDK 51-compatible version**

```powershell
npm install @react-native-community/datetimepicker@8.0.1
```

Expected: install succeeds; `package.json` dependencies gain `"@react-native-community/datetimepicker": "8.0.1"`.

- [ ] **Step 2: Verify it loaded cleanly**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "build: add @react-native-community/datetimepicker for birthday entry"
```

Note: The user must rebuild the native app (`npm run android`) before the date picker renders on the emulator. This is documented in the smoke-test instructions added in Task 11.

---

## Task 2: Pure birthday math utility (TDD)

**Files:**
- Create: `src/utils/birthday.ts`
- Create: `src/utils/__tests__/birthday.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/birthday.test.ts`:

```ts
import { daysUntilBirthday, formatBirthday } from '../birthday';

describe('daysUntilBirthday', () => {
  it('returns 0 when birthday is today', () => {
    expect(daysUntilBirthday('05-09', new Date('2026-05-09T12:00:00Z'))).toBe(0);
  });

  it('returns 1 when birthday is tomorrow', () => {
    expect(daysUntilBirthday('05-10', new Date('2026-05-09T12:00:00Z'))).toBe(1);
  });

  it('returns 30 for a birthday 30 days out', () => {
    expect(daysUntilBirthday('06-08', new Date('2026-05-09T12:00:00Z'))).toBe(30);
  });

  it('rolls forward to next year for past birthdays', () => {
    // Today 2026-05-09; birthday 2026-04-01 already passed → use 2027-04-01
    const d = daysUntilBirthday('04-01', new Date('2026-05-09T12:00:00Z'));
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(365);
  });

  it('handles leap-day birthdays in non-leap years (rounds to Mar 1)', () => {
    // 2026 is not a leap year; 02-29 should be treated as 03-01
    expect(daysUntilBirthday('02-29', new Date('2026-02-28T12:00:00Z'))).toBe(1);
  });

  it('returns null for malformed input', () => {
    expect(daysUntilBirthday(undefined, new Date())).toBeNull();
    expect(daysUntilBirthday('', new Date())).toBeNull();
    expect(daysUntilBirthday('13-99', new Date())).toBeNull();
    expect(daysUntilBirthday('not-a-date', new Date())).toBeNull();
  });
});

describe('formatBirthday', () => {
  it('returns short month + day for valid input', () => {
    expect(formatBirthday('03-15')).toBe('Mar 15');
    expect(formatBirthday('11-30')).toBe('Nov 30');
  });

  it('returns null for malformed input', () => {
    expect(formatBirthday(undefined)).toBeNull();
    expect(formatBirthday('13-99')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm test -- --testPathPattern=birthday
```

Expected: FAIL — `Cannot find module '../birthday'`.

- [ ] **Step 3: Implement `src/utils/birthday.ts`**

```ts
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMmdd(mmdd: string | undefined | null): { month: number; day: number } | null {
  if (!mmdd || typeof mmdd !== 'string') return null;
  const m = mmdd.match(/^(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Days from `today` until the next occurrence of birthday `mmdd` (rolls
 * forward to next year if this year's date has passed). Leap-day birthdays
 * (02-29) on non-leap years count as Mar 1. Returns `null` for malformed input.
 */
export function daysUntilBirthday(
  mmdd: string | undefined | null,
  today: Date,
): number | null {
  const parsed = parseMmdd(mmdd);
  if (!parsed) return null;
  let { month, day } = parsed;

  // Normalize today to UTC midnight so day math doesn't drift across timezones
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let year = today.getUTCFullYear();

  // Leap-day on non-leap year → Mar 1
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    month = 3;
    day = 1;
  }

  let target = Date.UTC(year, month - 1, day);
  if (target < todayUtc) {
    year += 1;
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      target = Date.UTC(year, 2, 1);
    } else {
      target = Date.UTC(year, month - 1, day);
    }
  }
  return Math.round((target - todayUtc) / 86_400_000);
}

export function formatBirthday(mmdd: string | undefined | null): string | null {
  const parsed = parseMmdd(mmdd);
  if (!parsed) return null;
  return `${SHORT_MONTHS[parsed.month - 1]} ${parsed.day}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm test -- --testPathPattern=birthday
```

Expected: 8 tests pass.

- [ ] **Step 5: Run full gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors each.

- [ ] **Step 6: Commit**

```powershell
git add src/utils/birthday.ts "src/utils/__tests__/birthday.test.ts"
git commit -m "feat(utils): birthday math helpers + 8 tests"
```

---

## Task 3: Owner-claim privacy filter (TDD)

**Files:**
- Create: `src/utils/wishlist-privacy.ts`
- Create: `src/utils/__tests__/wishlist-privacy.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/wishlist-privacy.test.ts`:

```ts
import { filterClaimsForViewer } from '../wishlist-privacy';
import { WishItemClaim } from '../../types';

const claims: Record<string, WishItemClaim> = {
  i1: { itemId: 'i1', claimedBy: 'b', claimedAt: 1 },
  i2: { itemId: 'i2', claimedBy: 'c', claimedAt: 2 },
};

describe('filterClaimsForViewer', () => {
  it('returns empty object when viewer is the owner (privacy hold)', () => {
    expect(filterClaimsForViewer(claims, 'a', 'a')).toEqual({});
  });

  it('passes claims through when viewer is not the owner', () => {
    expect(filterClaimsForViewer(claims, 'a', 'b')).toEqual(claims);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm test -- --testPathPattern=wishlist-privacy
```

Expected: FAIL — `Cannot find module '../wishlist-privacy'`.

- [ ] **Step 3: Implement `src/utils/wishlist-privacy.ts`**

```ts
import { WishItemClaim } from '../types';

/**
 * Belt-and-suspenders client-side enforcement of the wishlist owner privacy
 * invariant: the owner of a wishlist must NOT see who claimed any of their
 * items (preserves the gift surprise). Even if the RTDB rules layer is missing
 * or buggy, the UI must not render claim info to the owner.
 *
 * Returns an empty object when `viewerId === ownerId`, otherwise passes
 * `claims` through unchanged.
 */
export function filterClaimsForViewer(
  claims: Record<string, WishItemClaim>,
  ownerId: string,
  viewerId: string,
): Record<string, WishItemClaim> {
  if (ownerId === viewerId) return {};
  return claims;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm test -- --testPathPattern=wishlist-privacy
```

Expected: 2 tests pass.

- [ ] **Step 5: Run full gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors each.

- [ ] **Step 6: Commit**

```powershell
git add src/utils/wishlist-privacy.ts "src/utils/__tests__/wishlist-privacy.test.ts"
git commit -m "feat(utils): owner-claim privacy filter + tests"
```

---

## Task 4: db.ts changes — `setMemberBirthday` + atomic claim

**Files:**
- Modify: `src/firebase/db.ts`

- [ ] **Step 1: Add `setMemberBirthday` op**

Open `src/firebase/db.ts`. Find the `addMember` function (around line 43, in the "Member ops" section). Add this immediately after it:

```ts
/**
 * Set or clear a member's birthday (MM-DD format). Pass `null` to clear.
 * Same trust model as renaming a member: any group member can write, since
 * RTDB rules grant member writes broadly. V2.5 hardening pass should restrict
 * to `auth.uid == memberId`.
 */
export async function setMemberBirthday(
  groupId: string,
  memberId: string,
  birthday: string | null,
): Promise<void> {
  await update(ref(db, `groups/${groupId}/members/${memberId}`), {
    birthday: birthday ?? null,
  });
}
```

- [ ] **Step 2: Convert `claimWishItem` from `set` to `runTransaction`**

In the same file, find `claimWishItem` (around line 198). Replace its body so concurrent claimers can't silently overwrite each other:

```ts
export async function claimWishItem(
  groupId: string,
  ownerMemberId: string,
  itemId: string,
  claimerMemberId: string,
): Promise<void> {
  const r = ref(db, `groups/${groupId}/wishlists/${ownerMemberId}/claims/${itemId}`);
  const result = await runTransaction(r, (current: WishItemClaim | null) => {
    if (current && current.claimedBy !== claimerMemberId) {
      // Already claimed by someone else — abort so caller knows.
      return; // returning undefined aborts the transaction
    }
    const claim: WishItemClaim = {
      itemId,
      claimedBy: claimerMemberId,
      claimedAt: Date.now(),
    };
    return claim;
  });
  if (!result.committed) {
    // Surface the conflict so UI can show "already claimed by X"
    throw new Error('CLAIM_CONFLICT');
  }
}
```

- [ ] **Step 3: Run gates**

```powershell
npx tsc --noEmit; npm test; npm run lint
```

Expected: 0 errors. `Tests: 84 passed, 84 total` (74 pre-existing + 8 birthday + 2 privacy = 84).

- [ ] **Step 4: Commit**

```powershell
git add src/firebase/db.ts
git commit -m "feat(db): setMemberBirthday + atomic transactional claim"
```

---

## Task 5: `useWishlist` hook

**Files:**
- Create: `src/hooks/useWishlist.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useWishlist.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WishItem, WishItemClaim } from '../types';
import {
  subscribeToWishlist,
  addWishItem,
  deleteWishItem,
  claimWishItem,
  unclaimWishItem,
} from '../firebase/db';
import { filterClaimsForViewer } from '../utils/wishlist-privacy';

export function useWishlist(
  groupId: string,
  ownerId: string,
  viewerId: string,
) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [claims, setClaims] = useState<Record<string, WishItemClaim>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToWishlist(groupId, ownerId, (i, c) => {
      setItems(i);
      // Belt + suspenders — enforce privacy even if RTDB rules are missing.
      setClaims(filterClaimsForViewer(c, ownerId, viewerId));
      setLoading(false);
    });
    return unsub;
  }, [groupId, ownerId, viewerId]);

  const addItem = useCallback(
    async (input: { title: string; url?: string; priceCents?: number }) => {
      const item: WishItem = {
        id: uuidv4(),
        title: input.title,
        url: input.url,
        priceCents: input.priceCents,
        createdAt: Date.now(),
      };
      await addWishItem(groupId, ownerId, item);
    },
    [groupId, ownerId],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      await deleteWishItem(groupId, ownerId, itemId);
    },
    [groupId, ownerId],
  );

  const claim = useCallback(
    async (itemId: string, claimerId: string) => {
      await claimWishItem(groupId, ownerId, itemId, claimerId);
    },
    [groupId, ownerId],
  );

  const unclaim = useCallback(
    async (itemId: string) => {
      await unclaimWishItem(groupId, ownerId, itemId);
    },
    [groupId, ownerId],
  );

  return { items, claims, loading, addItem, deleteItem, claim, unclaim };
}
```

- [ ] **Step 2: Run gates**

```powershell
npx tsc --noEmit; npm test; npm run lint
```

Expected: 0 errors, 84 tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useWishlist.ts
git commit -m "feat(hook): useWishlist with privacy filter + actions"
```

---

## Task 6: `useWishlistSummaries` hook (landing item-counts)

**Files:**
- Create: `src/hooks/useWishlistSummaries.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useWishlistSummaries.ts`:

```ts
import { useState, useEffect } from 'react';
import { subscribeToWishlist } from '../firebase/db';

/**
 * Subscribes per-member to derive item counts only (no claims) for the
 * wishlist members landing. Item counts are non-private; subscribing per-owner
 * (instead of to the parent /wishlists node) avoids the RTDB rules failure
 * mode where reading a parent fails if any descendant claim is unreadable.
 */
export function useWishlistSummaries(groupId: string, memberIds: string[]) {
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Stable membership key so the effect re-runs only on actual member changes.
  const membersKey = memberIds.slice().sort().join(',');

  useEffect(() => {
    if (memberIds.length === 0) {
      setItemCounts({});
      setLoading(false);
      return;
    }
    let resolved = 0;
    const unsubs: Array<() => void> = [];
    for (const ownerId of memberIds) {
      const unsub = subscribeToWishlist(groupId, ownerId, (items) => {
        setItemCounts((prev) => ({ ...prev, [ownerId]: items.length }));
        resolved += 1;
        if (resolved >= memberIds.length) setLoading(false);
      });
      unsubs.push(unsub);
    }
    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, membersKey]);

  return { itemCounts, loading };
}
```

- [ ] **Step 2: Run gates**

```powershell
npx tsc --noEmit; npm test; npm run lint
```

Expected: 0 errors, 84 tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useWishlistSummaries.ts
git commit -m "feat(hook): useWishlistSummaries (per-member item counts)"
```

---

## Task 7: `AddWishItemScreen` — add-a-wish form

**Files:**
- Create: `src/screens/AddWishItemScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/AddWishItemScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, StatusBar, useColorScheme, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlist } from '../hooks/useWishlist';
import { useProfile } from '../contexts/ProfileContext';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddWishItem'>;
  route: RouteProp<RootStackParamList, 'AddWishItem'>;
};

export function AddWishItemScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { group } = useGroup(groupId);
  const myId = profile?.deviceId ?? '';
  const { addItem } = useWishlist(groupId, myId, myId);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [priceText, setPriceText] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = group?.currency ?? 'USD';

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give the wish a name.');
      return;
    }
    setSaving(true);
    try {
      // Parse price: accept "12.34" or "12,34" or "12" → cents (1234, 1234, 1200)
      const cleaned = priceText.trim().replace(',', '.');
      let priceCents: number | undefined;
      if (cleaned !== '') {
        const f = parseFloat(cleaned);
        if (Number.isFinite(f) && f >= 0) {
          priceCents = Math.round(f * 100);
        }
      }
      await addItem({
        title: title.trim(),
        url: url.trim() || undefined,
        priceCents,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.error('[wishlist:add]', e);
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.onBackground }]}>Add a wish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>What do you want?</Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="e.g. Camera bag"
          placeholderTextColor={theme.onSurfaceVariant}
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={120}
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Link (optional)</Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="https://amazon.de/..."
          placeholderTextColor={theme.onSurfaceVariant}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
          Approx. price ({currency}, optional)
        </Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="45"
          placeholderTextColor={theme.onSurfaceVariant}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="decimal-pad"
        />
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveBtn, (saving || !title.trim()) && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving || !title.trim()}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save wish'}</Text>
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
  label: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  saveBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Run gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors. (Tests are unchanged.)

- [ ] **Step 3: Commit**

```powershell
git add src/screens/AddWishItemScreen.tsx
git commit -m "feat(wishlist): AddWishItemScreen — title + url + price form"
```

---

## Task 8: `WishlistDetailScreen` — per-member view

**Files:**
- Create: `src/screens/WishlistDetailScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/WishlistDetailScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, StatusBar, useColorScheme, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlist } from '../hooks/useWishlist';
import { useProfile } from '../contexts/ProfileContext';
import { setMemberBirthday } from '../firebase/db';
import { daysUntilBirthday, formatBirthday } from '../utils/birthday';
import { formatCents } from '../utils/money';
import { WishItem } from '../types';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WishlistDetail'>;
  route: RouteProp<RootStackParamList, 'WishlistDetail'>;
};

export function WishlistDetailScreen({ navigation, route }: Props) {
  const { groupId, ownerId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const myId = profile?.deviceId ?? '';
  const isMe = ownerId === myId;
  const { group } = useGroup(groupId);
  const { items, claims, loading, deleteItem, claim, unclaim } =
    useWishlist(groupId, ownerId, myId);

  const [showPicker, setShowPicker] = useState(false);

  const owner = group?.members?.[ownerId];
  const ownerName = isMe ? 'You' : (owner?.name ?? 'Member');
  const currency = group?.currency ?? 'USD';

  // Birthday display
  const birthdayDays = daysUntilBirthday(owner?.birthday, new Date());
  const birthdayLabel = (() => {
    if (birthdayDays === null) return null;
    if (birthdayDays === 0) return '🎂 Today!';
    if (birthdayDays <= 30) return `🎂 in ${birthdayDays} day${birthdayDays === 1 ? '' : 's'}`;
    return `🎂 ${formatBirthday(owner?.birthday)}`;
  })();

  const handleSetBirthday = (_: unknown, date?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // Android dismisses immediately; iOS stays open
    if (!date) return;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setMemberBirthday(groupId, ownerId, `${mm}-${dd}`).catch((e) => {
      console.error('[wishlist:birthday]', e);
      Alert.alert('Could not save', 'Check your connection and try again.');
    });
  };

  const handleClearBirthday = () => {
    Alert.alert('Clear birthday?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMemberBirthday(groupId, ownerId, null).catch((e) => {
            console.error('[wishlist:birthday]', e);
          });
        },
      },
    ]);
  };

  const handleClaim = async (itemId: string) => {
    Haptics.selectionAsync();
    try {
      await claim(itemId, myId);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === 'CLAIM_CONFLICT'
        ? 'This was just claimed by someone else. Refresh and try a different one.'
        : 'Check your connection and try again.';
      Alert.alert('Could not claim', msg);
      console.error('[wishlist:claim]', e);
    }
  };

  const handleUnclaim = async (itemId: string) => {
    Haptics.selectionAsync();
    try {
      await unclaim(itemId);
    } catch (e) {
      console.error('[wishlist:unclaim]', e);
      Alert.alert('Could not unclaim', 'Check your connection and try again.');
    }
  };

  const handleDelete = (item: WishItem) => {
    Alert.alert('Delete wish?', `"${item.title}" — this cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item.id);
          } catch (e) {
            console.error('[wishlist:delete]', e);
          }
        },
      },
    ]);
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: WishItem }) => {
    const claimInfo = claims[item.id];
    const claimedByMe = claimInfo?.claimedBy === myId;
    const claimedByOther = claimInfo && !claimedByMe;
    const claimerName = claimedByOther
      ? (group?.members?.[claimInfo!.claimedBy]?.name ?? 'someone')
      : null;

    return (
      <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: theme.onSurface }]}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            {item.priceCents != null && (
              <Text style={[styles.itemPrice, { color: theme.onSurfaceVariant }]}>
                {formatCents(item.priceCents, currency)}
              </Text>
            )}
            {item.url && (
              <TouchableOpacity onPress={() => openUrl(item.url!)}>
                <Text style={[styles.itemLink, { color: COLORS.primary }]} numberOfLines={1}>
                  🔗 link
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {!isMe && claimedByMe && (
            <Text style={[styles.claimedByYou, { color: COLORS.primary }]}>
              ✓ Claimed by you
            </Text>
          )}
          {!isMe && claimedByOther && (
            <Text style={[styles.claimedByOther, { color: theme.onSurfaceVariant }]}>
              Claimed by {claimerName}
            </Text>
          )}
        </View>
        {isMe ? (
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={[styles.deleteBtnText, { color: COLORS.danger }]}>Delete</Text>
          </TouchableOpacity>
        ) : claimedByMe ? (
          <TouchableOpacity onPress={() => handleUnclaim(item.id)} style={styles.actionBtnSecondary}>
            <Text style={[styles.actionBtnSecondaryText, { color: theme.onSurface }]}>Unclaim</Text>
          </TouchableOpacity>
        ) : claimedByOther ? (
          <View style={[styles.actionBtnDisabled, { borderColor: theme.border }]}>
            <Text style={[styles.actionBtnDisabledText, { color: theme.onSurfaceVariant }]}>—</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleClaim(item.id)} style={styles.actionBtnPrimary}>
            <Text style={styles.actionBtnPrimaryText}>Claim</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.onBackground }]}>{ownerName}</Text>
          {birthdayLabel && (
            <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>{birthdayLabel}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isMe && (
        <View style={[styles.bdayRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.bdayLabel, { color: theme.onSurface }]}>
            🎂 Birthday: {owner?.birthday ? formatBirthday(owner.birthday) : 'not set'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.bdayBtn}>
              <Text style={styles.bdayBtnText}>{owner?.birthday ? 'Change' : 'Set'}</Text>
            </TouchableOpacity>
            {owner?.birthday && (
              <TouchableOpacity onPress={handleClearBirthday} style={styles.bdayBtnGhost}>
                <Text style={[styles.bdayBtnGhostText, { color: COLORS.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={handleSetBirthday}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {isMe ? 'No wishes yet. Tap + to add one.' : `${ownerName} hasn't added any wishes yet.`}
            </Text>
          </View>
        }
      />

      {isMe && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddWishItem', { groupId })}
        >
          <Text style={styles.fabText}>＋ Add a wish</Text>
        </TouchableOpacity>
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
  bdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  bdayLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  bdayBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bdayBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  bdayBtnGhost: { paddingVertical: 6, paddingHorizontal: 12 },
  bdayBtnGhostText: { fontSize: 13, fontWeight: '700' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  itemPrice: { fontSize: 13 },
  itemLink: { fontSize: 13, fontWeight: '600' },
  claimedByYou: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  claimedByOther: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnPrimaryText: { color: '#000', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  actionBtnDisabled: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  actionBtnDisabledText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Run gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors. (No new tests; hooks/utils already pinned by their unit tests.)

- [ ] **Step 3: Commit**

```powershell
git add src/screens/WishlistDetailScreen.tsx
git commit -m "feat(wishlist): WishlistDetailScreen — items, claims, birthday entry"
```

---

## Task 9: `WishlistMembersList` — in-tab content

**Files:**
- Create: `src/screens/WishlistMembersList.tsx`

- [ ] **Step 1: Implement the component**

Create `src/screens/WishlistMembersList.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlistSummaries } from '../hooks/useWishlistSummaries';
import { useProfile } from '../contexts/ProfileContext';
import { daysUntilBirthday, formatBirthday } from '../utils/birthday';
import { Member } from '../types';
import { COLORS, useThemeColors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Group'>;

export function WishlistMembersList({
  groupId,
  navigation,
}: {
  groupId: string;
  navigation: Nav;
}) {
  const theme = useThemeColors();
  const { group } = useGroup(groupId);
  const { profile } = useProfile();
  const myId = profile?.deviceId ?? '';

  // Members, with "You" pinned to the top.
  const members = useMemo<Member[]>(() => {
    const all = Object.values(group?.members ?? {});
    const me = all.find((m) => m.id === myId);
    const others = all.filter((m) => m.id !== myId);
    return me ? [me, ...others] : all;
  }, [group, myId]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { itemCounts } = useWishlistSummaries(groupId, memberIds);

  const renderRow = ({ item }: { item: Member }) => {
    const isMe = item.id === myId;
    const count = itemCounts[item.id] ?? 0;
    const days = daysUntilBirthday(item.birthday, new Date());
    const bdayChip = (() => {
      if (days === null) return null;
      if (days === 0) return '🎂 Today';
      if (days <= 30) return `🎂 in ${days}d`;
      return `🎂 ${formatBirthday(item.birthday)}`;
    })();

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('WishlistDetail', { groupId, ownerId: item.id })}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.onSurface }]}>
            {isMe ? 'You' : item.name}
          </Text>
          <Text style={[styles.meta, { color: theme.onSurfaceVariant }]}>
            {count === 0 ? '— no wishes yet' : `${count} wish${count === 1 ? '' : 'es'}`}
            {bdayChip ? ` · ${bdayChip}` : ''}
          </Text>
        </View>
        <Text style={[styles.chev, { color: theme.onSurfaceVariant }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={members}
      renderItem={renderRow}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
            No members yet.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 2: Run gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src/screens/WishlistMembersList.tsx
git commit -m "feat(wishlist): WishlistMembersList in-tab content"
```

---

## Task 10: Wire navigator routes

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Add route types**

Open `src/navigation/AppNavigator.tsx`. Replace the `RootStackParamList` definition:

```ts
export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string };
  AddExpense: { groupId: string; expenseId?: string };
  NewGame: { groupId: string };
  GameSession: { groupId: string; sessionId: string };
  WishlistDetail: { groupId: string; ownerId: string };
  AddWishItem: { groupId: string };
};
```

- [ ] **Step 2: Add screen imports**

In the same file, add to the imports near the top (after the existing screen imports):

```ts
import { WishlistDetailScreen } from '../screens/WishlistDetailScreen';
import { AddWishItemScreen } from '../screens/AddWishItemScreen';
```

- [ ] **Step 3: Register the screens in the Stack.Navigator**

Add these two lines inside the `<Stack.Navigator>` block, after the `GameSession` entry:

```tsx
<Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} />
<Stack.Screen name="AddWishItem" component={AddWishItemScreen} />
```

- [ ] **Step 4: Run gates**

```powershell
npx tsc --noEmit; npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add src/navigation/AppNavigator.tsx
git commit -m "feat(nav): register WishlistDetail + AddWishItem routes"
```

---

## Task 11: Wire Wishes tab into GroupScreen

**Files:**
- Modify: `src/screens/GroupScreen.tsx`

- [ ] **Step 1: Add the import**

Open `src/screens/GroupScreen.tsx`. Add this import alongside the others near the top:

```ts
import { WishlistMembersList } from './WishlistMembersList';
```

- [ ] **Step 2: Extend the `Tab` union**

Find the line:

```ts
type Tab = 'expenses' | 'balances' | 'games';
```

Replace with:

```ts
type Tab = 'expenses' | 'balances' | 'games' | 'wishes';
```

- [ ] **Step 3: Update the tabs row to include Wishes**

Find the tabs `.map` block (around line 228):

```tsx
{(['expenses', 'balances', 'games'] as Tab[]).map((t) => (
  <TouchableOpacity
    key={t}
    style={[styles.tab, tab === t && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
    onPress={() => setTab(t)}
  >
    <Text style={[styles.tabText, { color: tab === t ? COLORS.primary : theme.onSurfaceVariant }]}>
      {t === 'expenses' ? '📋 Expenses' : t === 'balances' ? '⚖️ Balances' : '🎲 Games'}
    </Text>
  </TouchableOpacity>
))}
```

Replace with:

```tsx
{(['expenses', 'balances', 'games', 'wishes'] as Tab[]).map((t) => (
  <TouchableOpacity
    key={t}
    style={[styles.tab, tab === t && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
    onPress={() => setTab(t)}
  >
    <Text
      style={[styles.tabText, { color: tab === t ? COLORS.primary : theme.onSurfaceVariant }]}
      numberOfLines={1}
    >
      {t === 'expenses' ? '📋 Expenses'
       : t === 'balances' ? '⚖️ Balances'
       : t === 'games' ? '🎲 Games'
       : '🎁 Wishes'}
    </Text>
  </TouchableOpacity>
))}
```

Also, update the `tabText` style to shrink slightly so 4 tabs fit on phone widths. Find the `styles.tabText` definition (near the bottom of the file) and change `fontSize: 14` to `fontSize: 13`.

- [ ] **Step 4: Render the wishlist content**

Find the `{tab === 'games' && ...}` block (around line 274). Add this immediately after that block (before the FAB section):

```tsx
{tab === 'wishes' && (
  <WishlistMembersList groupId={groupId} navigation={navigation} />
)}
```

- [ ] **Step 5: Run gates**

```powershell
npx tsc --noEmit; npm test; npm run lint
```

Expected: 0 errors, 84 tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/screens/GroupScreen.tsx
git commit -m "feat(group): wire Wishes tab into GroupScreen"
```

---

## Task 12: Final verify + USER_TODO smoke test

**Files:**
- Modify: `USER_TODO.md`

- [ ] **Step 1: Run all gates one more time**

```powershell
npx tsc --noEmit; npm test; npm run lint
```

Expected: 0 errors, 84 tests pass, lint clean.

- [ ] **Step 2: Append smoke-test instructions to USER_TODO.md**

Append this block to the end of `USER_TODO.md`:

```markdown
### V2C Wishlist UI — manual smoke test on emulator

Native code changed (added `@react-native-community/datetimepicker`). You
need to rebuild before the new screens render.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:Path;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:JAVA_HOME\bin"

# Make sure Divvy_Pixel emulator is up; then:
cd C:\Users\marty\OneDrive\Desktop\Agents\Idea_Executor\Divvy
npm run android   # ~2-3 min with warm Gradle cache
```

**Test the new flow (single phone first):**
1. Open a group → tap the new **🎁 Wishes** tab
2. The list shows members with "You" pinned at top
3. Tap **You** → tap **Set** next to the birthday row → pick a date → confirm it shows "🎂 in N days" or "🎂 Mon DD"
4. Tap **＋ Add a wish** → enter "Camera bag", URL `https://amazon.de`, price `45` → Save
5. Back on the members landing, your row should show "1 wish · 🎂 in N days"
6. Tap **You** again — verify NO claim badge shows on the camera bag (privacy hold for owner)

**Test multi-phone (privacy + claim coordination):**
1. On phone 2 (or second emulator), join the same group as a different member
2. Tap **🎁 Wishes** → tap the first user's row → see the camera bag → tap **Claim**
3. Verify the row now shows **✓ Claimed by you** with **Unclaim** button
4. Switch back to phone 1, tap **You** → verify still NO claim info shown
5. Phone 2: tap **Unclaim** → verify it returns to **Claim**
6. (Optional, if you have a third device) phone 3 claims the same item → on phone 2 it should show "Claimed by [phone3 name]" with disabled `—` button. Test concurrent race: two phones tap **Claim** at the same instant — exactly one succeeds, the other gets "Already claimed by X" alert thanks to the `runTransaction` guard.

If anything looks wrong: `adb logcat -d -t 100 ReactNativeJS:* "*:S"` shows recent JS errors.

**Note:** The privacy guarantee currently has only the client-side filter. The
RTDB rules update for true server-enforcement is still pending in the
"Wishlist privacy — RTDB rules update needed" section above.
```

- [ ] **Step 3: Commit**

```powershell
git add USER_TODO.md
git commit -m "docs(wishlist): smoke-test instructions for V2C"
```

- [ ] **Step 4: Wishlist V2C complete — final commit**

```powershell
git commit --allow-empty -m "chore: V2C complete — Wishlist UI shippable"
```

---

# Done

When all 12 tasks above are checked, all gates green, and `USER_TODO.md` updated:
- 84 tests pass (74 existing + 8 birthday + 2 privacy)
- Typecheck 0, lint 0
- 4 new screens, 2 new hooks, 2 new utils, 4 modified files
- 1 new dependency (`@react-native-community/datetimepicker@8.0.1`)

The wishlist UI is shippable. Privacy enforcement at the RTDB rules layer remains pending in `USER_TODO.md` as a follow-up rules-only change.
