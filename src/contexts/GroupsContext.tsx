import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GroupMeta, getGroupMeta } from '../firebase/db';
import { useProfile } from './ProfileContext';

type Ctx = {
  groups: GroupMeta[];
  loading: boolean;
  refresh: () => Promise<void>;
  addLocally: (g: GroupMeta) => void;
};

const GroupsContext = createContext<Ctx | null>(null);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const fetched = await Promise.all(profile.joinedGroups.map(getGroupMeta));
      const valid = fetched.filter((g): g is GroupMeta => g !== null);
      setGroups(valid.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error('[groups] refresh failed', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addLocally = useCallback((g: GroupMeta) => {
    setGroups((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
  }, []);

  return (
    <GroupsContext.Provider value={{ groups, loading, refresh, addLocally }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups(): Ctx {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error('useGroups must be used within GroupsProvider');
  return ctx;
}
