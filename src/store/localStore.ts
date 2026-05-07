import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { LocalProfile } from '../types';

const PROFILE_KEY = '@divvy_profile';

/**
 * Read or create the local profile.
 * @param authUid Optional Firebase Auth UID. When provided, replaces any
 *   stale `deviceId` in storage so the persisted identity matches the
 *   server-side member-bound rules.
 */
export async function getOrCreateProfile(authUid?: string): Promise<LocalProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalProfile;
      if (authUid && parsed.deviceId !== authUid) {
        const migrated = { ...parsed, deviceId: authUid };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    } catch (e) {
      console.error('[profile] corrupted JSON, recreating', e);
    }
  }
  const profile: LocalProfile = {
    deviceId: authUid ?? uuidv4(),
    name: '',
    joinedGroups: [],
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function updateProfile(patch: Partial<LocalProfile>): Promise<LocalProfile> {
  const current = await getOrCreateProfile();
  const updated = { ...current, ...patch };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

export async function addGroupToProfile(groupId: string): Promise<void> {
  const profile = await getOrCreateProfile();
  if (!profile.joinedGroups.includes(groupId)) {
    await updateProfile({ joinedGroups: [...profile.joinedGroups, groupId] });
  }
}

export async function removeGroupFromProfile(groupId: string): Promise<void> {
  const profile = await getOrCreateProfile();
  await updateProfile({
    joinedGroups: profile.joinedGroups.filter((id) => id !== groupId),
  });
}
