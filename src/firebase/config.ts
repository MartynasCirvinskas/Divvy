import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
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
export const auth = getAuth(app);

export async function ensureAnonAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const result = await signInAnonymously(auth);
  return result.user.uid;
}
