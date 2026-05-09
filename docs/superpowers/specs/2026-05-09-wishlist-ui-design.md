# Wishlist UI — Design Spec

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan
**Predecessor:** `PLAN_V2.md` Tasks C.1 (types) + C.2 (DB ops) — already shipped. This spec covers C.3 (the deferred UI).

## Goal

Ship a per-member wishlist feature inside each Divvy group: members can add items they want, others can browse the lists and claim items as gifts, and birthdays surface naturally to give the feature a "when do I need this gift?" anchor. Owner-can't-see-who-claimed-what is preserved (the gift-surprise invariant).

## Non-goals

- **Push/server notifications for upcoming birthdays.** Local scaffold from V2A is in place but a real reminder flow is its own plan (it ties into FCM service-account setup that needs user action — see `USER_TODO.md`).
- **Server-side rules enforcement of claim privacy.** The RTDB rules update is documented in `USER_TODO.md`; this spec layers a client-side filter on top as belt-and-suspenders. Production-hardening lives in a follow-up rules-only plan.
- **Wishlist data export, sharing outside the group, or per-item images.** Out of scope for V1.
- **Birthday-driven UI re-ordering of the members list** (e.g. "next birthday first"). Defer until a real user actually has a 5+ person group and asks for it.

## Architecture

### New files (7)

| Path | Role |
|---|---|
| `src/screens/WishlistMembersList.tsx` | Content view rendered when `tab === 'wishes'` inside `GroupScreen`. Not a navigated screen — composes into the existing tab switch. Lives in its own file because `GroupScreen` is already 442 lines. |
| `src/screens/WishlistDetailScreen.tsx` | Navigated screen. Per-member view: own list + add affordance, OR another member's list + claim buttons. Birthday row in the header. |
| `src/screens/AddWishItemScreen.tsx` | Navigated screen. Modal-style form for adding one item: title (required) + URL (optional) + price (optional). Mirrors `AddExpenseScreen` pattern. |
| `src/hooks/useWishlist.ts` | Single-owner hook wrapping `subscribeToWishlist` + the four mutation ops. Applies the owner-claim filter (see Privacy below). |
| `src/hooks/useWishlistSummaries.ts` | Landing-list hook. Subscribes per-member and exposes `Record<ownerId, itemCount>`. **Item counts only** — does not subscribe to claims (avoids the RTDB-rules failure mode where reading the parent node fails if any descendant claim is unreadable). |
| `src/utils/birthday.ts` (+ tests) | Pure `daysUntilBirthday(mmdd, today)` and `formatBirthday(mmdd)` helpers. |
| `src/utils/wishlist-privacy.ts` (+ test) | One-function `filterClaimsForViewer(claims, ownerId, viewerId)`. Extracted so a unit test pins the privacy guarantee. |

### Modified files (3)

| Path | Change |
|---|---|
| `src/firebase/db.ts` | Add `setMemberBirthday(groupId, memberId, mmdd \| null)` op. Switch `claimWishItem` from `set()` to `runTransaction()` so concurrent claimers can't silently overwrite each other. |
| `src/screens/GroupScreen.tsx` | Add `'wishes'` to the `Tab` union, add the tab button (`🎁 Wishes`), render `<WishlistMembersList />` when active. No FAB on this tab — the "+ Add a wish" CTA lives inside the detail screen for the user's own list. |
| `src/navigation/AppNavigator.tsx` | Register `WishlistDetail { groupId, ownerId }` and `AddWishItem { groupId }` routes. |

`src/types/index.ts` is **not** modified — `WishItem`, `WishItemClaim`, and `Member.birthday` were all added during V2A Tasks C.1–C.2.

### Why birthdays go on the `Member` object

`Member.birthday` already exists in the type. The current RTDB rules grant any group member write access to `groups/{id}/members/{anyMemberId}` (same trust model as today, where any member can rename any other member). For V2 this is acceptable; the hardening pass would lock writes to `auth.uid == memberId`. Documented as a known limitation in `USER_TODO.md` rather than fixed in this plan.

## Data flow

```
GroupScreen (tab='wishes')
  └─ WishlistMembersList
       ├─ useWishlistSummaries(groupId, members)   // N item-count subscriptions
       ├─ useGroup(groupId)                        // already cached, gives birthdays
       └─ list rows → onPress → push 'WishlistDetail' { groupId, ownerId }

WishlistDetailScreen
  ├─ useWishlist(groupId, ownerId)                 // items + claims for this one owner
  ├─ useGroup(groupId)                             // owner's name + birthday
  ├─ useProfile()                                  // myDeviceId, to detect "is this me?"
  ├─ if isMe:
  │     ├─ Birthday row (set/edit via native date picker)
  │     ├─ Item list (no claim info — owner privacy)
  │     └─ FAB: "+ Add a wish" → push 'AddWishItem' { groupId }
  └─ else:
        ├─ Birthday row (read-only "🎂 in 12 days")
        ├─ Item list with [Claim] / [Claimed by you] / [Claimed by Anna] per row
        └─ no FAB

AddWishItemScreen (own list only)
  └─ form: title (required) + url + price → addWishItem → goBack
```

### Hook contracts

```ts
function useWishlist(groupId: string, ownerId: string): {
  items: WishItem[];
  claims: Record<string, WishItemClaim>;  // empty when ownerId === myDeviceId
  loading: boolean;
  addItem(item: Omit<WishItem, 'id' | 'createdAt'>): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  claim(itemId: string, claimerId: string): Promise<void>;   // throws on race
  unclaim(itemId: string): Promise<void>;
};

function useWishlistSummaries(groupId: string, memberIds: string[]): {
  itemCounts: Record<string, number>;  // ownerId -> count
  loading: boolean;
};
```

## Privacy

Two layers protect "owner can't see who claimed what":

1. **RTDB rules** (deferred to a future rules-only plan; documented in `USER_TODO.md`). When deployed, claim reads return `null` for the owner.
2. **Client filter — `filterClaimsForViewer(claims, ownerId, viewerId)`** — pinned by a unit test. Returns `{}` when `ownerId === viewerId`, otherwise passes through. `useWishlist` calls this before exposing `claims` to the UI. Even if the rules layer is missing or buggy, the UI cannot render claim info to the owner.

## Birthday display logic

`daysUntilBirthday('11-30', new Date('2026-05-09'))` → `205`.

| `daysUntilBirthday` result | Display |
|---|---|
| `< 0` (impossible — function rolls forward to next occurrence) | n/a |
| `0` | `🎂 Today!` |
| `1–30` | `🎂 in N days` |
| `> 30` | `🎂 Mar 15` (year-agnostic) |
| `null` (no birthday set) | nothing |

Leap-day birthday `02-29` on a non-leap year → round to Mar 1.

## Error handling & edge cases

| Case | Behavior |
|---|---|
| Network failure on add/claim/delete | `try/catch` + `Alert.alert('Could not save', ...)` + `console.error('[wishlist]', e)`. No retry loop. Matches `AddExpense`/`GameSession` pattern. |
| Concurrent claim race | `claimWishItem` switches to `runTransaction` on `claims/{itemId}`. Aborts if a claim already exists with a different `claimedBy`. Losing client gets `'Already claimed by Anna'` alert; live subscription updates the row. |
| Deleting an item that has a claim | Existing `deleteWishItem` already does atomic multi-path delete of items + claims. No change. |
| Member leaves group | Their wishlist data stays orphaned at `wishlists/{theirId}` but is invisible because `useWishlistSummaries` iterates current members only. No cleanup in V1. |
| Game-session `team:*` participants leak into members list | Filter out IDs starting with `team:` at the wishlist landing. Defensive — shouldn't happen, since teams aren't members. |
| Empty states | Members landing — never empty. Detail (own, no items) — `'No wishes yet. Tap + to add one.'` Detail (other, no items) — `'Anna hasn't added any wishes yet.'` |
| Birthday entry | Native date picker. Year discarded — store `MM-DD`. Clear button writes `null`. |
| URL field | No validation. `Linking.openURL(url)` on tap, wrapped in `try/catch`. OS rejects nonsense. Don't gate save. |
| Price field | Numeric keyboard, parsed to cents using `src/utils/money.ts`. Empty = `undefined`, not `0`. Currency from `group.currency`. |

## Testing

### Unit tests (new)

- `src/utils/__tests__/birthday.test.ts` — 6 tests:
  1. today → `0`
  2. 1 day from now → `1`
  3. 30 days from now → `30`
  4. 200 days from now → `200` (rolls forward across year boundary)
  5. leap-day birthday `02-29` on a non-leap year → rounds to Mar 1
  6. invalid input (`undefined`, malformed `'13-99'`) → `null`
- `src/utils/__tests__/wishlist-privacy.test.ts` — 2 tests:
  1. `filterClaimsForViewer(claims, 'a', 'a')` → `{}` (owner viewing self)
  2. `filterClaimsForViewer(claims, 'a', 'b')` → `claims` (other viewer pass-through)

### Hook tests — skip

The current codebase has no React Hook tests (no `@testing-library/react-hooks` installed). Adding the harness now is scope creep. Hooks are thin wrappers over already-tested DB ops + already-tested pure utils.

### Manual smoke test (append to `USER_TODO.md`)

1. Open a group → tap `🎁 Wishes`
2. Tap "You" → set your birthday → add a wish ("Camera bag", €45, amazon URL)
3. Verify members landing shows `🎂 in N days · 1 item` for you
4. Open same group on second emulator as a different member → tap "You" (the first user) → see the camera bag → tap `[Claim]`
5. Switch back to phone 1, tap "You" → verify **NO claim info shown** (privacy hold confirmed)
6. Phone 2: tap `[Unclaim]` → verify it returns to `[Claim]`

### Gates

`npx tsc --noEmit && npm test && npm run lint` clean before each commit. Same as V2A.

## Out-of-scope handoffs

These move to `USER_TODO.md` as follow-ups:

- **RTDB rules update** for claim privacy enforcement (not just client-filter).
- **Member.birthday write rule lock-down** — currently any member can edit any member's birthday (same as name). Tighten to `auth.uid == memberId`.
- **Push notifications for upcoming birthdays** — depends on FCM service-account setup.

## Definition of done

- All new files and modifications above are in place.
- 8 new tests pass (6 birthday + 2 privacy).
- Existing 74 tests still pass.
- Typecheck 0, lint 0.
- Manual smoke test instructions appended to `USER_TODO.md`.
- Each task committed with conventional message.
