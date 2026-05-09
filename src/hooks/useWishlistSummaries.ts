import { useState, useEffect } from 'react';
import { subscribeToWishlist } from '../firebase/db';

/**
 * Subscribes per-member to derive item counts only (no claims) for the
 * wishlist members landing. Item counts are non-private; subscribing per-owner
 * (instead of to the parent /wishlists node) avoids the RTDB rules failure
 * mode where reading a parent fails if any descendant claim is unreadable.
 */
export function useWishlistSummaries(groupId: string, memberIds: string[]) {
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Stable membership key so the effect re-runs only on actual member changes.
  const membersKey = memberIds.slice().sort().join(',');

  useEffect(() => {
    if (memberIds.length === 0) {
      setItemCounts({});
      setLoading(false);
      return;
    }
    let resolved = 0;
    const unsubs: Array<() => void> = [];
    for (const ownerId of memberIds) {
      const unsub = subscribeToWishlist(groupId, ownerId, (items) => {
        setItemCounts((prev) => ({ ...prev, [ownerId]: items.length }));
        resolved += 1;
        if (resolved >= memberIds.length) setLoading(false);
      });
      unsubs.push(unsub);
    }
    return () => {
      unsubs.forEach((u) => u());
    };
    // Note: membersKey is derived and stable; memberIds changes tracked via sorted join.
  }, [groupId, membersKey]);

  return { itemCounts, loading };
}
