# Things only you can do

This file is appended to by the autonomous Ralph runs whenever they hit something that requires your hands (Firebase console, real device, paid services, etc.). Read top-to-bottom when you're back.

**Last updated:** 2026-05-08, before Ralph V2A run

---

## Pre-existing items (from V1 hardening)

### 1. Orphan Secret Santa-codes from smoke testing

The earlier smoke test script left ~5 test codes (`SMK*`) as orphans in your RTDB because the codes-deletion rule is currently too strict. To clean up:

- Firebase console → Realtime Database → `codes` node → manually delete entries starting with `SMK`
- Or: temporarily relax the codes-write rule, run cleanup, restore

This isn't blocking anything — orphan codes don't collide with real generated codes (they're 6 random chars).

### 2. Optional V1 launch prep

When ready to actually publish:
- Replace solid-teal placeholder PNGs in `assets/` with real artwork
- Set up an Expo account → `npx eas-cli login` → `npx eas-cli init` → `npm run build:preview:android` for a real APK
- Or stay local: `npm run android` keeps working with Android Studio + emulator

---

## Items appended during V2A Ralph run

(These will be filled in by Ralph as it runs. Each section starts with a `### `.)

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

**On the running emulator/device after rebuild:**
The app will request notification permission once on first launch (after
onboarding). On Android 13+ you'll see the OS prompt; tap Allow. On
emulator (where `Device.isDevice` is false), `ensureNotificationPermission()`
short-circuits and returns null — local-schedule still works for in-app
testing.

### V2 Game Scoring — manual smoke test on emulator

Native code changed (added `expo-notifications`, `expo-device`,
`react-native-android-widget` is NOT yet added — that's V1.1 widget work).
You need to rebuild before the new screens render.

```powershell
# 1. Make sure emulator is up
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:Path;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:JAVA_HOME\bin"

# Either reuse the running emulator or restart it:
emulator -avd Divvy_Pixel -no-snapshot-save -no-boot-anim
# (in another terminal once it boots:)
adb devices

# 2. From the project root:
cd C:\Users\marty\OneDrive\Desktop\Agents\Idea_Executor\Divvy
npm run android   # ~2-3 min with warm Gradle cache
```

**Test the new flow:**
1. Open a group (or create one)
2. Tap the **🎲 Games** tab
3. Tap **＋ New Game** at the bottom
4. Enter "Catan", pick "⬆️ Most wins", select yourself + add a team named "Reds"
5. Tap **▶ Start Game**
6. On the live scoreboard: tap +1, +5, -1 buttons — scores update via runTransaction
7. Tap **End Game** → confirm
8. Verify the winner banner shows
9. Tap back → see session in the Games tab list with 🏆 prefix and winner name
10. To test multi-phone: open the same group on a second emulator/device, start a game on phone A, watch scoreboard update on phone B as you tap on A

If anything looks wrong: `adb logcat -d -t 100 ReactNativeJS:* "*:S"` shows recent JS errors.

### Birthday wishlist — UI deferred to a future plan

Phase C of `PLAN_V2.md` had a bonus task to build the WishlistScreen
UI on top of the data layer. UI scope was too big to fit cleanly into
this Ralph run; data layer (types + DB ops) shipped instead. The UI
work is well-scoped for a future plan: ~1-2 days for a basic
"per-member wishlist + claim/unclaim button + add-to-my-wishlist"
flow, slotted as a third tab on GroupScreen alongside Expenses and
Games.

Reference: PLAN_V2.md Tasks C.1 (types), C.2 (DB), C.3 (UI — deferred).

### Wishlist privacy — RTDB rules update needed (when wishlist UI ships)

The data layer is in place but the RTDB rules in `firebase-rules.json`
don't yet protect the privacy split. When you build the wishlist UI
(currently deferred — only types + DB ops shipped this run), update
the rules to add this block, then paste into Firebase console:

```json
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
```

Two caveats:
1. The exact selectors depend on `$groupId` being available in the path
   context — this requires the rules to be nested inside `groups/$groupId/wishlists/...`,
   not at the root. Rewrite to slot inside the existing `groups/$groupId`
   block.
2. The claimer should be able to read their own claim back so they know
   what they've reserved. The above rule denies read to ALL non-owners
   except via the implicit "you can read what you wrote." Test in the
   Firebase Rules Playground before publishing — wishlist privacy bugs
   ruin gifts and trust.

### V1.1 widget work (deferred per WIDGET_RESEARCH.md)

When ready (post-launch, ~6-8 weeks out), the widget plan is:

1. `npm install react-native-android-widget` + add its config plugin to
   `app.config.js`
2. Build a Balance + Quick-Add widget per the spec in WIDGET_RESEARCH.md
3. ~1 week solo dev effort

Skipped for now — pre-launch widget ROI is near zero. Detailed plan is in
WIDGET_RESEARCH.md.
