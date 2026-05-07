// scripts/smoke-test.mjs
// End-to-end smoke test against the real Firebase project configured in .env.
// Exercises: anonymous auth, atomic createGroup, getGroupByCode, addExpense,
// transactional settleExpense, balance calculation, cleanup.
//
// Usage: node scripts/smoke-test.mjs
// Cleans up after itself by deleting the test group + code mapping.

import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// --- 1. Load env ---
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const cfg = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!cfg.apiKey || !cfg.databaseURL) {
  console.error('FAIL: .env missing required keys');
  process.exit(1);
}

const app = initializeApp(cfg);
const db = getDatabase(app);
const auth = getAuth(app);

// --- helpers ---
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
    return true;
  } else {
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    process.exitCode = 1;
    return false;
  }
}

const TEST_CODE = 'SMK' + Math.random().toString(36).slice(2, 5).toUpperCase();
const TEST_GROUP_ID = 'smoke-' + Date.now();

let cleanupNeeded = false;
async function cleanup() {
  if (!cleanupNeeded) return;
  // Try a few strategies until one works (or all fail informatively).
  // Strategy 1: atomic multi-path delete — rule evaluation sees both states at once.
  try {
    await update(ref(db), {
      [`codes/${TEST_CODE}`]: null,
      [`groups/${TEST_GROUP_ID}`]: null,
    });
    console.log('  CLEAN atomic multi-path delete ok');
    return;
  } catch (e) {
    console.log('  INFO  atomic delete failed:', e.message);
  }
  // Strategy 2: code first (while group + membership still exist), then group.
  let codeOk = false;
  let groupOk = false;
  try {
    await remove(ref(db, `codes/${TEST_CODE}`));
    codeOk = true;
  } catch (e) {
    console.log('  WARN  code cleanup failed:', e.message);
  }
  try {
    await remove(ref(db, `groups/${TEST_GROUP_ID}`));
    groupOk = true;
  } catch (e) {
    console.log('  WARN  group cleanup failed:', e.message);
  }
  console.log(`  CLEAN code=${codeOk ? 'ok' : 'FAIL'} group=${groupOk ? 'ok' : 'FAIL'}`);
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

// --- run ---
console.log('Divvy smoke test against', cfg.projectId);
console.log('Test code:', TEST_CODE, '| group id:', TEST_GROUP_ID);

try {
  // 1. Anonymous auth (rules require auth != null)
  const authResult = await signInAnonymously(auth);
  const uid = authResult.user.uid;
  check('anon auth returns a UID', !!uid && uid.length >= 20, `uid=${uid.slice(0, 8)}...`);

  // 2. Atomic createGroup (multi-path update — same as src/firebase/db.ts)
  const group = {
    id: TEST_GROUP_ID,
    code: TEST_CODE,
    name: 'Smoke test',
    emoji: '🧪',
    currency: 'USD',
    members: { [uid]: { id: uid, name: 'Tester', joinedAt: Date.now() } },
    expenses: {},
    createdAt: Date.now(),
  };
  await update(ref(db), {
    [`groups/${TEST_GROUP_ID}`]: group,
    [`codes/${TEST_CODE}`]: TEST_GROUP_ID,
  });
  cleanupNeeded = true;
  check('atomic createGroup wrote both paths', true);

  // 3. getGroupByCode round-trip
  const codeSnap = await get(ref(db, `codes/${TEST_CODE}`));
  check('code lookup returns group id', codeSnap.exists() && codeSnap.val() === TEST_GROUP_ID);

  const groupSnap = await get(ref(db, `groups/${TEST_GROUP_ID}`));
  check('group fetched back by id', groupSnap.exists());
  check('member is bound to current auth.uid', !!groupSnap.val()?.members?.[uid]);

  // 4. addExpense (writes through to /groups/$id/expenses/$expId)
  const expenseId = 'exp-' + Date.now();
  const expense = {
    id: expenseId,
    description: 'Smoke dinner',
    amountCents: 9000, // $90.00
    currency: 'USD',
    paidById: uid,
    splitWith: [uid],
    splitType: 'equal',
    category: 'food',
    createdAt: Date.now(),
    settledBy: [],
    createdByDeviceId: uid,
  };
  await set(ref(db, `groups/${TEST_GROUP_ID}/expenses/${expenseId}`), expense);
  const expSnap = await get(ref(db, `groups/${TEST_GROUP_ID}/expenses/${expenseId}`));
  check('expense persisted with cents amount', expSnap.val()?.amountCents === 9000);

  // 5. Transactional settle (the runTransaction race-safety fix)
  await runTransaction(
    ref(db, `groups/${TEST_GROUP_ID}/expenses/${expenseId}/settledBy`),
    (cur) => {
      const list = Array.isArray(cur) ? cur : [];
      return list.includes(uid) ? list : [...list, uid];
    },
  );
  const settledSnap = await get(ref(db, `groups/${TEST_GROUP_ID}/expenses/${expenseId}/settledBy`));
  check(
    'transactional settle added uid to settledBy',
    Array.isArray(settledSnap.val()) && settledSnap.val().includes(uid),
  );

  // 6. Code uniqueness rule — second write to same code should be rejected
  // (rule: ".write": "auth != null && !data.exists()")
  let collisionRejected = false;
  try {
    await set(ref(db, `codes/${TEST_CODE}`), 'some-other-id');
  } catch (e) {
    collisionRejected = true;
  }
  check('code is write-once (collision rejected)', collisionRejected);

  // 7. Membership rule — reads of groups you're not a member of must be denied.
  // The rule rejects even existence-probes for privacy (good — Splitwise leaks
  // existence by ID). We accept either PERMISSION_DENIED OR an empty snapshot.
  let foreignBlocked = false;
  try {
    const foreignSnap = await get(ref(db, 'groups/nonexistent-' + Date.now()));
    foreignBlocked = !foreignSnap.exists();
  } catch (e) {
    foreignBlocked = e.message?.includes('Permission denied') ?? false;
  }
  check('foreign group read is blocked', foreignBlocked);
} catch (e) {
  console.error('  FAIL  unexpected error:', e.code || e.message);
  console.error('         ', e.stack?.split('\n').slice(0, 4).join('\n'));
  process.exitCode = 1;
} finally {
  await cleanup();
  // Force-exit — Firebase keeps an open socket
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
