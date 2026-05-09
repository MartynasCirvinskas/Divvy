import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, StatusBar, useColorScheme, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlist } from '../hooks/useWishlist';
import { useProfile } from '../contexts/ProfileContext';
import { setMemberBirthday } from '../firebase/db';
import { daysUntilBirthday, formatBirthday } from '../utils/birthday';
import { formatCents } from '../utils/money';
import { WishItem } from '../types';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WishlistDetail'>;
  route: RouteProp<RootStackParamList, 'WishlistDetail'>;
};

export function WishlistDetailScreen({ navigation, route }: Props) {
  const { groupId, ownerId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const myId = profile?.deviceId ?? '';
  const isMe = ownerId === myId;
  const { group } = useGroup(groupId);
  const { items, claims, loading, deleteItem, claim, unclaim } =
    useWishlist(groupId, ownerId, myId);

  const [showPicker, setShowPicker] = useState(false);

  const owner = group?.members?.[ownerId];
  const ownerName = isMe ? 'You' : (owner?.name ?? 'Member');
  const currency = group?.currency ?? 'USD';

  // Birthday display
  const birthdayDays = daysUntilBirthday(owner?.birthday, new Date());
  const birthdayLabel = (() => {
    if (birthdayDays === null) return null;
    if (birthdayDays === 0) return '🎂 Today!';
    if (birthdayDays <= 30) return `🎂 in ${birthdayDays} day${birthdayDays === 1 ? '' : 's'}`;
    return `🎂 ${formatBirthday(owner?.birthday)}`;
  })();

  const handleSetBirthday = (_: unknown, date?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // Android dismisses immediately; iOS stays open
    if (!date) return;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setMemberBirthday(groupId, ownerId, `${mm}-${dd}`).catch((e) => {
      console.error('[wishlist:birthday]', e);
      Alert.alert('Could not save', 'Check your connection and try again.');
    });
  };

  const handleClearBirthday = () => {
    Alert.alert('Clear birthday?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMemberBirthday(groupId, ownerId, null).catch((e) => {
            console.error('[wishlist:birthday]', e);
          });
        },
      },
    ]);
  };

  const handleClaim = async (itemId: string) => {
    Haptics.selectionAsync();
    try {
      await claim(itemId, myId);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === 'CLAIM_CONFLICT'
        ? 'This was just claimed by someone else. Refresh and try a different one.'
        : 'Check your connection and try again.';
      Alert.alert('Could not claim', msg);
      console.error('[wishlist:claim]', e);
    }
  };

  const handleUnclaim = async (itemId: string) => {
    Haptics.selectionAsync();
    try {
      await unclaim(itemId);
    } catch (e) {
      console.error('[wishlist:unclaim]', e);
      Alert.alert('Could not unclaim', 'Check your connection and try again.');
    }
  };

  const handleDelete = (item: WishItem) => {
    Alert.alert('Delete wish?', `"${item.title}" — this cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item.id);
          } catch (e) {
            console.error('[wishlist:delete]', e);
          }
        },
      },
    ]);
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: WishItem }) => {
    const claimInfo = claims[item.id];
    const claimedByMe = claimInfo?.claimedBy === myId;
    const claimedByOther = claimInfo && !claimedByMe;
    const claimerName = claimedByOther
      ? (group?.members?.[claimInfo!.claimedBy]?.name ?? 'someone')
      : null;

    return (
      <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: theme.onSurface }]}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            {item.priceCents != null && (
              <Text style={[styles.itemPrice, { color: theme.onSurfaceVariant }]}>
                {formatCents(item.priceCents, currency)}
              </Text>
            )}
            {item.url && (
              <TouchableOpacity onPress={() => openUrl(item.url!)}>
                <Text style={[styles.itemLink, { color: COLORS.primary }]} numberOfLines={1}>
                  🔗 link
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {!isMe && claimedByMe && (
            <Text style={[styles.claimedByYou, { color: COLORS.primary }]}>
              ✓ Claimed by you
            </Text>
          )}
          {!isMe && claimedByOther && (
            <Text style={[styles.claimedByOther, { color: theme.onSurfaceVariant }]}>
              Claimed by {claimerName}
            </Text>
          )}
        </View>
        {isMe ? (
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={[styles.deleteBtnText, { color: COLORS.danger }]}>Delete</Text>
          </TouchableOpacity>
        ) : claimedByMe ? (
          <TouchableOpacity onPress={() => handleUnclaim(item.id)} style={styles.actionBtnSecondary}>
            <Text style={[styles.actionBtnSecondaryText, { color: theme.onSurface }]}>Unclaim</Text>
          </TouchableOpacity>
        ) : claimedByOther ? (
          <View style={[styles.actionBtnDisabled, { borderColor: theme.border }]}>
            <Text style={[styles.actionBtnDisabledText, { color: theme.onSurfaceVariant }]}>—</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleClaim(item.id)} style={styles.actionBtnPrimary}>
            <Text style={styles.actionBtnPrimaryText}>Claim</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.onBackground }]}>{ownerName}</Text>
          {birthdayLabel && (
            <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>{birthdayLabel}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isMe && (
        <View style={[styles.bdayRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.bdayLabel, { color: theme.onSurface }]}>
            🎂 Birthday: {owner?.birthday ? formatBirthday(owner.birthday) : 'not set'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.bdayBtn}>
              <Text style={styles.bdayBtnText}>{owner?.birthday ? 'Change' : 'Set'}</Text>
            </TouchableOpacity>
            {owner?.birthday && (
              <TouchableOpacity onPress={handleClearBirthday} style={styles.bdayBtnGhost}>
                <Text style={[styles.bdayBtnGhostText, { color: COLORS.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={handleSetBirthday}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {isMe ? 'No wishes yet. Tap + to add one.' : `${ownerName} hasn't added any wishes yet.`}
            </Text>
          </View>
        }
      />

      {isMe && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddWishItem', { groupId })}
        >
          <Text style={styles.fabText}>＋ Add a wish</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  bdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  bdayLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  bdayBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bdayBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  bdayBtnGhost: { paddingVertical: 6, paddingHorizontal: 12 },
  bdayBtnGhostText: { fontSize: 13, fontWeight: '700' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  itemPrice: { fontSize: 13 },
  itemLink: { fontSize: 13, fontWeight: '600' },
  claimedByYou: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  claimedByOther: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnPrimaryText: { color: '#000', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  actionBtnDisabled: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  actionBtnDisabledText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
