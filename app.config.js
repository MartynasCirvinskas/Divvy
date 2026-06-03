module.exports = {
  expo: {
    name: 'EvenJar',
    slug: 'evenjar-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0D1117',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.evenjar.app',
      associatedDomains: ['applinks:evenjar.app'],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0D1117',
      },
      package: 'com.evenjar.app',
      permissions: ['VIBRATE', 'POST_NOTIFICATIONS'],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'evenjar.app', pathPrefix: '/g' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    scheme: 'evenjar',
    extra: {
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      },
    },
  },
};
