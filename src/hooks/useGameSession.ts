import { useState, useEffect, useCallback } from 'react';
import { GameSession } from '../types';
import {
  subscribeToGameSession,
  adjustScore,
  endGameSession,
  deleteGameSession,
} from '../firebase/db';
import { computeWinner } from '../utils/scoring';

export function useGameSession(groupId: string, sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToGameSession(groupId, sessionId, (s) => {
      setSession(s);
      setLoading(false);
    });
    return unsub;
  }, [groupId, sessionId]);

  const handleAdjust = useCallback(
    async (participantId: string, delta: number) => {
      if (!sessionId) return;
      await adjustScore(groupId, sessionId, participantId, delta);
    },
    [groupId, sessionId],
  );

  const handleEnd = useCallback(async () => {
    if (!sessionId || !session) return;
    const winner = computeWinner(session.scores ?? {}, session.scoringDirection);
    if (!winner) return;
    await endGameSession(groupId, sessionId, winner);
  }, [groupId, sessionId, session]);

  const handleDelete = useCallback(async () => {
    if (!sessionId) return;
    await deleteGameSession(groupId, sessionId);
  }, [groupId, sessionId]);

  return {
    session,
    loading,
    adjust: handleAdjust,
    end: handleEnd,
    deleteSession: handleDelete,
  };
}
