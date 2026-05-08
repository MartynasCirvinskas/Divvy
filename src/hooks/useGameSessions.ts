import { useState, useEffect } from 'react';
import { GameSession } from '../types';
import { subscribeToGameSessions } from '../firebase/db';

export function useGameSessions(groupId: string) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToGameSessions(groupId, (s) => {
      setSessions(s);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  return { sessions, loading };
}
