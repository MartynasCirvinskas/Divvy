import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LocalProfile } from '../types';
import {
  getOrCreateProfile,
  updateProfile as persistProfile,
  addGroupToProfile as persistAddGroup,
  removeGroupFromProfile as persistRemoveGroup,
} from '../store/localStore';
import { ensureAnonAuth } from '../firebase/config';

type Ctx = {
  profile: LocalProfile | null;
  loading: boolean;
  setName: (name: string) => Promise<void>;
  setOnboarded: (value: boolean) => Promise<void>;
  addGroup: (groupId: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      let uid: string | undefined;
      try {
        uid = await ensureAnonAuth();
      } catch (authErr) {
        // If Anonymous Auth fails (network, not enabled in console), fall back
        // to a local UUID. Reads/writes will still work in dev mode but the
        // member-bound rules will reject them in prod until auth recovers.
        console.warn('[profile] anon auth failed, using local UUID', authErr);
      }
      const p = await getOrCreateProfile(uid);
      setProfile(p);
    } catch (e) {
      console.error('[profile] load failed', e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setName = useCallback(async (name: string) => {
    const next = await persistProfile({ name });
    setProfile(next);
  }, []);

  const setOnboarded = useCallback(async (value: boolean) => {
    const next = await persistProfile({ onboarded: value });
    setProfile(next);
  }, []);

  const addGroup = useCallback(async (groupId: string) => {
    // Persist to AsyncStorage; don't block UI on a full reload.
    await persistAddGroup(groupId);
    // Optimistic state update — avoids a full reload() chain (re-runs anon
    // auth + AsyncStorage read + triggers GroupsContext refresh of all groups).
    setProfile((p) => {
      if (!p) return p;
      if (p.joinedGroups.includes(groupId)) return p;
      return { ...p, joinedGroups: [...p.joinedGroups, groupId] };
    });
  }, []);

  const removeGroup = useCallback(async (groupId: string) => {
    await persistRemoveGroup(groupId);
    setProfile((p) => {
      if (!p) return p;
      return { ...p, joinedGroups: p.joinedGroups.filter((id) => id !== groupId) };
    });
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profile, loading, setName, setOnboarded, addGroup, removeGroup, reload }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
