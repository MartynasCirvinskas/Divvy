import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, Share, StatusBar, useColorScheme, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Expense, CATEGORY_META, GameSession } from '../types';
import { useGroup } from '../hooks/useGroup';
import { useGameSessions } from '../hooks/useGameSessions';
import { WishlistMembersList } from './WishlistMembersList';
import { formatCents } from '../utils/money';
import { expensesToCsv } from '../utils/csv';
import { groupShareUrl } from '../utils/deeplink';
import { isParticipantTeam, teamLabel } from '../utils/scoring';
import { useProfile } from '../contexts/ProfileContext';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Group'>;
  route: RouteProp<RootStackParamList, 'Group'>;
};

type Tab = 'expenses' | 'balances' | 'games' | 'wishes';

export function GroupScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { group, loading, debts, debtsByPair, settleExpense } = useGroup(groupId);
  const { sessions: gameSessions } = useGameSessions(groupId);
  const [tab, setTab] = useState<Tab>('expenses');
  const { profile } = useProfile();
  const myDeviceId = profile?.deviceId ?? '';

  const handleShare = async () => {
    if (!group) return;
    const url = groupShareUrl(group.code);
    await Clipboard.setStringAsync(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Share.share({
      message: `Join my EvenJar group "${group.name}":\n${url}\n\nCode: ${group.code}`,
    });
  };

  const handleExport = async () => {
    if (!group) return;
    try {
      const exps = Object.values(group.expenses ?? {}).sort((a, b) => b.createdAt - a.createdAt);
      const csv = expensesToCsv(exps, group.members ?? {}, group.currency);
      const path = `${FileSystem.cacheDirectory}evenjar-${group.code}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          dialogTitle: 'Export expenses',
        });
      } else {
        Alert.alert('Sharing unavailable', `CSV saved to ${path}`);
      }
    } catch (e) {
      console.error('[export]', e);
      Alert.alert('Export failed', 'Try again or restart the app.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.onBackground }}>Group not found.</Text>
      </View>
    );
  }

  const members = group.members ?? {};
  const expenses = Object.values(group.expenses ?? {}).sort((a, b) => b.createdAt - a.createdAt);
  const totalCents = expenses.reduce((s, e) => s + e.amountCents, 0);

  const renderExpense = ({ item }: { item: Expense }) => {
    const payer = members[item.paidById];
    const cat = CATEGORY_META[item.category];
    const showFx =
      item.originalCurrency &&
      item.originalAmountCents != null &&
      item.originalCurrency !== group.currency;
    return (
      <TouchableOpacity
        style={[styles.expenseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('AddExpense', { groupId, expenseId: item.id })}
      >
        <Text style={styles.catEmoji}>{cat.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.expDesc, { color: theme.onSurface }]}>
            {item.recurrence ? '🔁 ' : ''}{item.description}
          </Text>
          <Text style={[styles.expMeta, { color: theme.onSurfaceVariant }]}>
            Paid by {payer?.name ?? 'Unknown'} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.expAmount, { color: COLORS.primary }]}>
            {formatCents(item.amountCents, group.currency)}
          </Text>
          {showFx && (
            <Text style={[styles.expFxBadge, { color: theme.onSurfaceVariant }]}>
              was {formatCents(item.originalAmountCents!, item.originalCurrency!)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleMarkSettled = (fromId: string, toId: string) => {
    const ids = debtsByPair.get(`${fromId}->${toId}`) ?? [];
    if (ids.length === 0) return;
    Alert.alert(
      'Mark as settled?',
      `This will mark ${ids.length} expense${ids.length === 1 ? '' : 's'} as paid by you to ${members[toId]?.name ?? '?'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            for (const id of ids) {
              try {
                await settleExpense(id, fromId);
              } catch (e) {
                console.error('[settle]', e);
              }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const renderDebt = ({ item }: { item: typeof debts[0] }) => {
    const from = members[item.from];
    const to = members[item.to];
    const isMe = item.from === myDeviceId;
    return (
      <View
        style={[
          styles.debtCard,
          { backgroundColor: theme.card, borderColor: isMe ? COLORS.danger : theme.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.debtText, { color: theme.onSurface }]}>
            <Text style={{ fontWeight: '700', color: isMe ? COLORS.danger : theme.onSurface }}>
              {from?.name ?? '?'}
            </Text>
            {' owes '}
            <Text style={{ fontWeight: '700' }}>{to?.name ?? '?'}</Text>
          </Text>
          <Text style={[styles.debtAmount, { color: isMe ? COLORS.danger : COLORS.primary }]}>
            {formatCents(item.amountCents, group.currency)}
          </Text>
        </View>
        {isMe && (
          <TouchableOpacity
            style={styles.settleBtn}
            onPress={() => handleMarkSettled(item.from, item.to)}
          >
            <Text style={styles.settleBtnText}>Mark settled</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.groupTitle, { color: theme.onBackground }]}>
            {group.emoji} {group.name}
          </Text>
          <Text style={[styles.groupCode, { color: theme.onSurfaceVariant }]}>
            Code: {group.code}
          </Text>
        </View>
        <TouchableOpacity onPress={handleExport} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>⬇</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>Total spent</Text>
        <Text style={[styles.totalAmount, { color: theme.onBackground }]}>
          {formatCents(totalCents, group.currency)}
        </Text>
        <Text style={[styles.totalMeta, { color: theme.onSurfaceVariant }]}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {Object.keys(members).length} members
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderColor: theme.border }]}>
        {(['expenses', 'balances', 'games', 'wishes'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[styles.tabText, { color: tab === t ? COLORS.primary : theme.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {t === 'expenses' ? '📋 Expenses'
               : t === 'balances' ? '⚖️ Balances'
               : t === 'games' ? '🎲 Games'
               : '🎁 Wishes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'expenses' && (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyEmoji}>🧾</Text>
              <Text style={[styles.listEmptyText, { color: theme.onSurfaceVariant }]}>
                No expenses yet. Add the first one!
              </Text>
            </View>
          }
        />
      )}
      {tab === 'balances' && (
        <FlatList
          data={debts}
          renderItem={renderDebt}
          keyExtractor={(d) => `${d.from}-${d.to}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyEmoji}>✅</Text>
              <Text style={[styles.listEmptyText, { color: theme.onSurfaceVariant }]}>
                All settled up!
              </Text>
            </View>
          }
        />
      )}
      {tab === 'games' && (
        <FlatList
          data={gameSessions}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: GameSession }) => {
            const winner = item.winnerId
              ? (isParticipantTeam(item.winnerId)
                  ? teamLabel(item.winnerId)
                  : members[item.winnerId]?.name ?? '?')
              : null;
            return (
              <TouchableOpacity
                style={[styles.gameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => navigation.navigate('GameSession', { groupId, sessionId: item.id })}
              >
                <Text style={styles.gameEmoji}>{item.endedAt ? '🏆' : '🎲'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gameName, { color: theme.onSurface }]}>{item.name}</Text>
                  <Text style={[styles.gameMeta, { color: theme.onSurfaceVariant }]}>
                    {item.endedAt
                      ? `${winner} won · ${new Date(item.endedAt).toLocaleDateString()}`
                      : `In progress · ${item.participants.length} players`}
                  </Text>
                </View>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyEmoji}>🎲</Text>
              <Text style={[styles.listEmptyText, { color: theme.onSurfaceVariant }]}>
                No games yet. Start one for your next game night!
              </Text>
            </View>
          }
        />
      )}
      {tab === 'wishes' && (
        <WishlistMembersList groupId={groupId} navigation={navigation} />
      )}

      {/* Context-sensitive FAB */}
      {tab === 'expenses' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddExpense', { groupId })}
        >
          <Text style={styles.fabText}>＋ Add Expense</Text>
        </TouchableOpacity>
      )}
      {tab === 'games' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewGame', { groupId })}
        >
          <Text style={styles.fabText}>＋ New Game</Text>
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
  groupTitle: { fontSize: 18, fontWeight: '700' },
  groupCode: { fontSize: 12, marginTop: 1 },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  iconBtnText: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  shareBtn: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  shareBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  totalCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  totalAmount: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  totalMeta: { fontSize: 12, marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  catEmoji: { fontSize: 24 },
  expDesc: { fontSize: 15, fontWeight: '600' },
  expMeta: { fontSize: 12, marginTop: 2 },
  expAmount: { fontSize: 16, fontWeight: '700' },
  expFxBadge: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  gameEmoji: { fontSize: 24 },
  gameName: { fontSize: 15, fontWeight: '600' },
  gameMeta: { fontSize: 12, marginTop: 2 },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  debtText: { fontSize: 15 },
  debtAmount: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  settleBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  settleBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  listEmpty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  listEmptyEmoji: { fontSize: 40 },
  listEmptyText: { fontSize: 14, textAlign: 'center' },
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
