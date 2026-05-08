import { computeWinner, isParticipantTeam, teamLabel, makeTeamId } from '../scoring';

describe('scoring', () => {
  describe('computeWinner', () => {
    it('high-wins: returns participant with highest score', () => {
      expect(computeWinner({ a: 10, b: 25, c: 15 }, 'high-wins')).toBe('b');
    });
    it('low-wins: returns participant with lowest score', () => {
      expect(computeWinner({ a: 10, b: 25, c: 15 }, 'low-wins')).toBe('a');
    });
    it('returns first tied participant deterministically (insertion order)', () => {
      expect(computeWinner({ a: 10, b: 10, c: 5 }, 'high-wins')).toBe('a');
    });
    it('returns null for empty scores', () => {
      expect(computeWinner({}, 'high-wins')).toBeNull();
    });
    it('handles single participant', () => {
      expect(computeWinner({ solo: 5 }, 'low-wins')).toBe('solo');
    });
    it('handles zero and negative scores', () => {
      expect(computeWinner({ a: 0, b: -5, c: 3 }, 'low-wins')).toBe('b');
      expect(computeWinner({ a: 0, b: -5, c: 3 }, 'high-wins')).toBe('c');
    });
  });

  describe('team labels', () => {
    it('isParticipantTeam recognizes team: prefix', () => {
      expect(isParticipantTeam('team:Alpha')).toBe(true);
      expect(isParticipantTeam('member-uid-123')).toBe(false);
      expect(isParticipantTeam('teamFoo')).toBe(false); // no colon
    });
    it('teamLabel strips the prefix', () => {
      expect(teamLabel('team:Alpha')).toBe('Alpha');
      expect(teamLabel('team:Team A')).toBe('Team A');
      expect(teamLabel('member-uid')).toBe('member-uid');
    });
    it('makeTeamId adds the prefix', () => {
      expect(makeTeamId('Reds')).toBe('team:Reds');
    });
    it('makeTeamId / teamLabel roundtrip', () => {
      const original = 'My Team Name';
      expect(teamLabel(makeTeamId(original))).toBe(original);
    });
  });
});
