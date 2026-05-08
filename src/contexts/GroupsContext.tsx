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
      // Compute the delta: which joinedGroup IDs aren't already known locally?
      // (addLocally already places freshly created/joined groups in state,
      // so refetching them is wasted work.)
      let missingIds: string[] = [];
      setGroups((existing) => {
        const known = new Set(existing.map((g) => g.id));
        const stillJoined = new Set(profile.joinedGroups);
        missingIds = profile.joinedGroups.filter((id) => !known.has(id));
        // Drop any groups the user has left
        const kept = existing.filter((g) => stillJoined.has(g.id));
        return kept.sort((a, b) => b.createdAt - a.createdAt);
      });
      if (missingIds.length === 0) {
        setLoading(false);
        return;
      }
      const fetched = await Promise.all(missingIds.map(getGroupMeta));
      const valid = fetched.filter((g): g is GroupMeta => g !== null);
      setGroups((prev) => {
        const map = new Map<string, GroupMeta>();
        [...prev, ...valid].forEach((g) => map.set(g.id, g));
        return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      });
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
