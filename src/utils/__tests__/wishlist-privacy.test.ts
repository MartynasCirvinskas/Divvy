import { filterClaimsForViewer } from '../wishlist-privacy';
import { WishItemClaim } from '../../types';

const claims: Record<string, WishItemClaim> = {
  i1: { itemId: 'i1', claimedBy: 'b', claimedAt: 1 },
  i2: { itemId: 'i2', claimedBy: 'c', claimedAt: 2 },
};

describe('filterClaimsForViewer', () => {
  it('returns empty object when viewer is the owner (privacy hold)', () => {
    expect(filterClaimsForViewer(claims, 'a', 'a')).toEqual({});
  });

  it('passes claims through when viewer is not the owner', () => {
    expect(filterClaimsForViewer(claims, 'a', 'b')).toEqual(claims);
  });
});
