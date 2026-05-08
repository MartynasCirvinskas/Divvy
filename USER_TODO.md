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
