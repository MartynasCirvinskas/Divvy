import { WishItemClaim } from '../types';

/**
 * Belt-and-suspenders client-side enforcement of the wishlist owner privacy
 * invariant: the owner of a wishlist must NOT see who claimed any of their
 * items (preserves the gift surprise). Even if the RTDB rules layer is missing
 * or buggy, the UI must not render claim info to the owner.
 *
 * Returns an empty object when `viewerId === ownerId`, otherwise passes
 * `claims` through unchanged.
 */
export function filterClaimsForViewer(
  claims: Record<string, WishItemClaim>,
  ownerId: string,
  viewerId: string,
): Record<string, WishItemClaim> {
  if (ownerId === viewerId) return {};
  return claims;
}
