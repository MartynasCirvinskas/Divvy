import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { LocalProfile } from '../types';

const PROFILE_KEY = '@divvy_profile';

export async function getOrCreateProfile(): Promise<LocalProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (raw) return JSON.parse(raw) as LocalProfile;

  const profile: LocalProfile = {
    deviceId: uuidv4(),
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
