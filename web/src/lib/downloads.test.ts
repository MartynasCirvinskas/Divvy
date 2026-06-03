import { describe, it, expect } from 'vitest';
import { downloadState } from './downloads';

describe('downloadState', () => {
  it('returns "coming-soon" for an empty url', () => {
    expect(downloadState('')).toBe('coming-soon');
  });
  it('returns "live" for a real url', () => {
    expect(downloadState('/downloads/evenjar.apk')).toBe('live');
  });
  it('treats whitespace-only as coming-soon', () => {
    expect(downloadState('   ')).toBe('coming-soon');
  });
});
