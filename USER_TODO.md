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
