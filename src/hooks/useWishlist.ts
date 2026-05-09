import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WishItem, WishItemClaim } from '../types';
import {
  subscribeToWishlist,
  addWishItem,
  deleteWishItem,
  claimWishItem,
  unclaimWishItem,
} from '../firebase/db';
import { filterClaimsForViewer } from '../utils/wishlist-privacy';

export function useWishlist(
  groupId: string,
  ownerId: string,
  viewerId: string,
) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [claims, setClaims] = useState<Record<string, WishItemClaim>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToWishlist(groupId, ownerId, (i, c) => {
      setItems(i);
      // Belt + suspenders — enforce privacy even if RTDB rules are missing.
      setClaims(filterClaimsForViewer(c, ownerId, viewerId));
      setLoading(false);
    });
    return unsub;
  }, [groupId, ownerId, viewerId]);

  const addItem = useCallback(
    async (input: { title: string; url?: string; priceCents?: number }) => {
      const item: WishItem = {
        id: uuidv4(),
        title: input.title,
        url: input.url,
        priceCents: input.priceCents,
        createdAt: Date.now(),
      };
      await addWishItem(groupId, ownerId, item);
    },
    [groupId, ownerId],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      await deleteWishItem(groupId, ownerId, itemId);
    },
    [groupId, ownerId],
  );

  const claim = useCallback(
    async (itemId: string, claimerId: string) => {
      await claimWishItem(groupId, ownerId, itemId, claimerId);
    },
    [groupId, ownerId],
  );

  const unclaim = useCallback(
    async (itemId: string) => {
      await unclaimWishItem(groupId, ownerId, itemId);
    },
    [groupId, ownerId],
  );

  return { items, claims, loading, addItem, deleteItem, claim, unclaim };
}
