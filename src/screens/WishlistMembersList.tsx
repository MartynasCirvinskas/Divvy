import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlistSummaries } from '../hooks/useWishlistSummaries';
import { useProfile } from '../contexts/ProfileContext';
import { daysUntilBirthday, formatBirthday } from '../utils/birthday';
import { Member } from '../types';
import { useThemeColors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Group'>;

export function WishlistMembersList({
  groupId,
  navigation,
}: {
  groupId: string;
  navigation: Nav;
}) {
  const theme = useThemeColors();
  const { group } = useGroup(groupId);
  const { profile } = useProfile();
  const myId = profile?.deviceId ?? '';

  // Members, with "You" pinned to the top.
  const members = useMemo<Member[]>(() => {
    const all = Object.values(group?.members ?? {});
    const me = all.find((m) => m.id === myId);
    const others = all.filter((m) => m.id !== myId);
    return me ? [me, ...others] : all;
  }, [group, myId]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { itemCounts } = useWishlistSummaries(groupId, memberIds);

  const renderRow = ({ item }: { item: Member }) => {
    const isMe = item.id === myId;
    const count = itemCounts[item.id] ?? 0;
    const days = daysUntilBirthday(item.birthday, new Date());
    const bdayChip = (() => {
      if (days === null) return null;
      if (days === 0) return '🎂 Today';
      if (days <= 30) return `🎂 in ${days}d`;
      return `🎂 ${formatBirthday(item.birthday)}`;
    })();

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('WishlistDetail', { groupId, ownerId: item.id })}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.onSurface }]}>
            {isMe ? 'You' : item.name}
          </Text>
          <Text style={[styles.meta, { color: theme.onSurfaceVariant }]}>
            {count === 0 ? '— no wishes yet' : `${count} wish${count === 1 ? '' : 'es'}`}
            {bdayChip ? ` · ${bdayChip}` : ''}
          </Text>
        </View>
        <Text style={[styles.chev, { color: theme.onSurfaceVariant }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={members}
      renderItem={renderRow}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
            No members yet.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
