import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, Share, StatusBar, useColorScheme, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Expense, CATEGORY_META } from '../types';
import { useGroup } from '../hooks/useGroup';
import { formatAmount } from '../utils/balances';
import { getOrCreateProfile } from '../store/localStore';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Group'>;
  route: RouteProp<RootStackParamList, 'Group'>;
};

type Tab = 'expenses' | 'balances';

export function GroupScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const { group, loading, debts, memberBalances } = useGroup(groupId);
  const [tab, setTab] = useState<Tab>('expenses');
  const [myDeviceId, setMyDeviceId] = useState('');

  useEffect(() => {
    getOrCreateProfile().then((p) => setMyDeviceId(p.deviceId));
  }, []);

  const handleShare = async () => {
    if (!group) return;
    await Clipboard.setStringAsync(group.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Share.share({
      message: `Join my group "${group.name}" on Divvy!\nEnter code: ${group.code}\nDownload: https://divvy.app`,
    });
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
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const renderExpense = ({ item }: { item: Expense }) => {
    const payer = members[item.paidById];
    const cat = CATEGORY_META[item.category];
    return (
      <TouchableOpacity
        style={[styles.expenseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('AddExpense', { groupId, expenseId: item.id })}
      >
        <Text style={styles.catEmoji}>{cat.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.expDesc, { color: theme.onSurface }]}>{item.description}</Text>
          <Text style={[styles.expMeta, { color: theme.onSurfaceVariant }]}>
            Paid by {payer?.name ?? 'Unknown'} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.expAmount, { color: COLORS.primary }]}>
          {formatAmount(item.amount, group.currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDebt = ({ item }: { item: typeof debts[0] }) => {
    const from = members[item.from];
    const to   = members[item.to];
    const isMe = item.from === myDeviceId;
    return (
      <View style={[styles.debtCard, { backgroundColor: theme.card, borderColor: isMe ? COLORS.danger : theme.border }]}>
        <Text style={[styles.debtText, { color: theme.onSurface }]}>
          <Text style={{ fontWeight: '700', color: isMe ? COLORS.danger : theme.onSurface }}>
            {from?.name ?? '?'}
          </Text>
          {' owes '}
          <Text style={{ fontWeight: '700' }}>{to?.name ?? '?'}</Text>
        </Text>
        <Text style={[styles.debtAmount, { color: isMe ? COLORS.danger : COLORS.primary }]}>
          {formatAmount(item.amount, group.currency)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={styles.header}>
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
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>Total spent</Text>
        <Text style={[styles.totalAmount, { color: theme.onBackground }]}>
          {formatAmount(total, group.currency)}
        </Text>
        <Text style={[styles.totalMeta, { color: theme.onSurfaceVariant }]}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {Object.keys(members).length} members
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderColor: theme.border }]}>
        {(['expenses', 'balances'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? COLORS.primary : theme.onSurfaceVariant }]}>
              {t === 'expenses' ? '📋 Expenses' : '⚖️ Balances'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'expenses' ? (
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
      ) : (
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

      {/* Add expense FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { groupId })}
      >
        <Text style={styles.fabText}>＋ Add Expense</Text>
      </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  groupTitle: { fontSize: 18, fontWeight: '700' },
  groupCode: { fontSize: 12, marginTop: 1 },
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
  tabText: { fontSize: 14, fontWeight: '600' },
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
  debtCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  debtText: { fontSize: 15 },
  debtAmount: { fontSize: 16, fontWeight: '700' },
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
