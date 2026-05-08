import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permission and (if granted) return the Expo push token
 * so the server can target this device. For V2A this is local-schedule only;
 * remote push via FCM requires google-services.json + the Expo project's
 * push credentials configured (see USER_TODO.md).
 */
export async function ensureNotificationPermission(): Promise<string | null> {
  if (!Device.isDevice) return null; // emulator/simulator: skip remote token
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.warn('[notifications] failed to get push token', e);
    return null;
  }
}

/**
 * Schedule a local notification at a specific timestamp. Used for in-app
 * reminders that don't need a server (e.g. settle-up nudges, birthday
 * reminders set on this device).
 */
export async function scheduleLocal(opts: {
  title: string;
  body: string;
  date: Date;
  data?: Record<string, unknown>;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: opts.title, body: opts.body, data: opts.data ?? {} },
    trigger: { date: opts.date },
  });
}

export async function cancelScheduled(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}
