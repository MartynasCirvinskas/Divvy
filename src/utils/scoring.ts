import { ScoringDirection } from '../types';

const TEAM_PREFIX = 'team:';

export function isParticipantTeam(id: string): boolean {
  return id.startsWith(TEAM_PREFIX);
}

export function teamLabel(id: string): string {
  return isParticipantTeam(id) ? id.slice(TEAM_PREFIX.length) : id;
}

export function makeTeamId(name: string): string {
  return `${TEAM_PREFIX}${name}`;
}

/**
 * Determine the winner of a session based on scoring direction.
 * Ties resolved by insertion order (first-tied wins) — deterministic and
 * sufficient for V1; group can manually override via UI later.
 */
export function computeWinner(
  scores: Record<string, number>,
  direction: ScoringDirection,
): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  let winner = entries[0][0];
  let winningScore = entries[0][1];
  for (let i = 1; i < entries.length; i++) {
    const [id, score] = entries[i];
    const isBetter = direction === 'high-wins' ? score > winningScore : score < winningScore;
    if (isBetter) {
      winner = id;
      winningScore = score;
    }
  }
  return winner;
}
