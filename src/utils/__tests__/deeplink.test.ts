import { groupShareUrl, parseJoinUrl } from '../deeplink';

describe('deeplink', () => {
  describe('groupShareUrl', () => {
    it('builds the canonical https URL', () => {
      expect(groupShareUrl('ABC234')).toBe('https://divvy.app/g/ABC234');
    });
  });

  describe('parseJoinUrl', () => {
    it('parses an https URL', () => {
      expect(parseJoinUrl('https://divvy.app/g/ABC234')).toBe('ABC234');
    });
    it('parses a divvy:// scheme URL', () => {
      expect(parseJoinUrl('divvy://g/XYZ789')).toBe('XYZ789');
    });
    it('uppercases lowercase codes', () => {
      expect(parseJoinUrl('https://divvy.app/g/abc234')).toBe('ABC234');
    });
    it('returns null for unrelated URLs', () => {
      expect(parseJoinUrl('https://divvy.app/about')).toBeNull();
      expect(parseJoinUrl('https://example.com/g/ABC234X')).toBeNull(); // 7 chars
    });
    it('returns null for malformed input', () => {
      expect(parseJoinUrl('not a url')).toBeNull();
      expect(parseJoinUrl('')).toBeNull();
    });
  });
});
