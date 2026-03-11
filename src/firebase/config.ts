// ─────────────────────────────────────────────────────────────────────────────
// Firebase configuration
//
// HOW TO SET UP (free):
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (e.g. "Divvy App")
// 3. Enable "Realtime Database" → Start in test mode
// 4. Go to Project Settings → Your apps → Add web app
// 5. Copy the firebaseConfig object below and replace the values
//
// Security rules for Realtime Database (paste in Firebase console):
// {
//   "rules": {
//     "groups": {
//       "$groupId": {
//         ".read": true,
//         ".write": true
//       }
//     }
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
