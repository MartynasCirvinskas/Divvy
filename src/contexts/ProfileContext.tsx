import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LocalProfile } from '../types';
import {
  getOrCreateProfile,
  updateProfile as persistProfile,
  addGroupToProfile as persistAddGroup,
  removeGroupFromProfile as persistRemoveGroup,
} from '../store/localStore';

type Ctx = {
  profile: LocalProfile | null;
  loading: boolean;
  setName: (name: string) => Promise<void>;
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
      const p = await getOrCreateProfile();
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

  const addGroup = useCallback(
    async (groupId: string) => {
      await persistAddGroup(groupId);
      await reload();
    },
    [reload],
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      await persistRemoveGroup(groupId);
      await reload();
    },
    [reload],
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, setName, addGroup, removeGroup, reload }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
