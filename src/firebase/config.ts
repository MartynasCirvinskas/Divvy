import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
// @ts-expect-error — getReactNativePersistence isn't declared in firebase v10's
// public types but is exported at runtime; required for RN auth state to survive
// app restarts (otherwise warns + uses memory persistence).
import { initializeAuth, getReactNativePersistence, getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const cfg = ((Constants.expoConfig?.extra as { firebase?: FirebaseConfig })?.firebase ?? {}) as FirebaseConfig;

if (!cfg.apiKey) {
  console.warn('[divvy] Firebase config missing — set EXPO_PUBLIC_FIREBASE_* env vars (see .env.example).');
}

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const db = getDatabase(app);

// On React Native, initializeAuth with AsyncStorage persistence MUST be called
// before getAuth to avoid the "memory persistence only" warning + auth state
// being lost on app restart. Wrapped in try/catch so a warm reload (where
// initializeAuth was already called) falls back to getAuth.
let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;

export async function ensureAnonAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const result = await signInAnonymously(auth);
  return result.user.uid;
}
