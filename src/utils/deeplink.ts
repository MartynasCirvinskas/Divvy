/** Public domain used in shared join links. */
export const SHARE_HOST = 'evenjar.app';

/** Builds the public share URL for a group join code. */
export function groupShareUrl(code: string): string {
  return `https://${SHARE_HOST}/g/${code}`;
}

/**
 * Parses a 6-character join code from any of:
 *  - https://evenjar.app/g/ABC123
 *  - evenjar://g/ABC123
 *  - any URL with /g/<6 chars> path
 *
 * Codes use unambiguous chars only (no O, 0, I, 1) — see generateGroupCode.
 */
export function parseJoinUrl(url: string): string | null {
  // /g/<6 chars> must be followed by end-of-string, '/', '?', or '#'.
  const match = url.match(/\/g\/([A-Za-z0-9]{6})(?:[/?#]|$)/);
  return match ? match[1].toUpperCase() : null;
}
