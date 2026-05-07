import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Expense, ExpenseCategory, CATEGORY_META, SplitType } from '../types';
import { useGroup } from '../hooks/useGroup';
import { useProfile } from '../contexts/ProfileContext';
import { COLORS, useThemeColors } from '../theme/colors';
import {
  parseAmountToCents,
  splitEqualCents,
  sumCents,
  formatCents,
} from '../utils/money';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
  route: RouteProp<RootStackParamList, 'AddExpense'>;
};

const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

export function AddExpenseScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const { group, addExpense } = useGroup(groupId);
  const { profile } = useProfile();
  const myDeviceId = profile?.deviceId ?? '';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidById, setPaidById] = useState('');
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (myDeviceId && !paidById) setPaidById(myDeviceId);
  }, [myDeviceId, paidById]);

  useEffect(() => {
    if (group) {
      setSplitWith(Object.keys(group.members ?? {}));
    }
  }, [group]);

  const toggleMember = (id: string) => {
    setSplitWith((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const amountCents = parseAmountToCents(amount);
    if (!description.trim()) {
      Alert.alert('Description required');
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      Alert.alert('Invalid amount');
      return;
    }
    if (splitWith.length === 0) {
      Alert.alert('Select at least one person to split with');
      return;
    }

    let finalCustomAmounts: Record<string, number> | undefined;
    if (splitType === 'custom') {
      finalCustomAmounts = {};
      const perMember: number[] = [];
      for (const id of splitWith) {
        const v = parseAmountToCents(customAmounts[id] ?? '');
        if (!Number.isFinite(v)) {
          Alert.alert('Invalid custom amount', `Enter a valid amount for everyone in the split.`);
          return;
        }
        finalCustomAmounts[id] = v;
        perMember.push(v);
      }
      const total = sumCents(perMember);
      if (total !== amountCents) {
        Alert.alert(
          'Amounts must sum to total',
          `Total: ${formatCents(amountCents, group?.currency ?? 'USD')}, Sum: ${formatCents(total, group?.currency ?? 'USD')}`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const expense: Expense = {
        id: uuidv4(),
        description: description.trim(),
        amountCents,
        currency: group?.currency ?? 'USD',
        paidById,
        splitWith,
        splitType,
        customAmounts: finalCustomAmounts,
        category,
        createdAt: Date.now(),
        settledBy: [],
        createdByDeviceId: myDeviceId,
      };
      await addExpense(expense);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.error('[add-expense]', e);
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const members = Object.values(group?.members ?? {});

  const equalShareLabel = (() => {
    const cents = parseAmountToCents(amount);
    if (!Number.isFinite(cents) || cents <= 0 || splitWith.length === 0) return null;
    const share = splitEqualCents(cents, splitWith.length)[0];
    return formatCents(share, group?.currency ?? 'USD');
  })();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: theme.onBackground }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.onBackground }]}>Add Expense</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.currencySymbol, { color: theme.onSurfaceVariant }]}>
            {group?.currency === 'EUR' ? '€' : group?.currency === 'GBP' ? '£' : '$'}
          </Text>
          <TextInput
            style={[styles.amountInput, { color: theme.onBackground }]}
            placeholder="0.00"
            placeholderTextColor={theme.onSurfaceVariant}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Description */}
        <TextInput
          style={[styles.input, { color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
          placeholder="What was it for?"
          placeholderTextColor={theme.onSurfaceVariant}
          value={description}
          onChangeText={setDescription}
        />

        {/* Category */}
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip,
                  { borderColor: theme.border },
                  category === c && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
                ]}
                onPress={() => setCategory(c)}
              >
                <Text style={{ fontSize: 18 }}>{CATEGORY_META[c].emoji}</Text>
                <Text style={[styles.catLabel, { color: category === c ? COLORS.primary : theme.onSurface }]}>
                  {CATEGORY_META[c].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Paid by */}
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>Paid by</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberChip,
                { borderColor: theme.border },
                paidById === m.id && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
              ]}
              onPress={() => setPaidById(m.id)}
            >
              <Text style={[styles.memberChipText, { color: paidById === m.id ? COLORS.primary : theme.onSurface }]}>
                {m.name}{m.id === myDeviceId ? ' (me)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split with */}
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>Split with</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberChip,
                { borderColor: theme.border },
                splitWith.includes(m.id) && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
              ]}
              onPress={() => toggleMember(m.id)}
            >
              <Text style={[styles.memberChipText, { color: splitWith.includes(m.id) ? COLORS.primary : theme.onSurface }]}>
                {m.name}{m.id === myDeviceId ? ' (me)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split type */}
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>How to split</Text>
        <View style={styles.splitTypeRow}>
          {(['equal', 'custom'] as SplitType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.splitTypeBtn,
                { borderColor: theme.border },
                splitType === t && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
              ]}
              onPress={() => setSplitType(t)}
            >
              <Text style={[styles.splitTypeText, { color: splitType === t ? COLORS.primary : theme.onSurface }]}>
                {t === 'equal' ? '⚖️ Equal' : '✏️ Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Equal split preview */}
        {splitType === 'equal' && equalShareLabel && (
          <View style={[styles.splitPreview, { backgroundColor: theme.card }]}>
            <Text style={[styles.splitPreviewText, { color: theme.onSurfaceVariant }]}>
              Each person pays {equalShareLabel}
            </Text>
          </View>
        )}

        {/* Custom amounts */}
        {splitType === 'custom' && splitWith.map((id) => {
          const member = group?.members[id];
          return (
            <View key={id} style={styles.customRow}>
              <Text style={[styles.customName, { color: theme.onSurface }]}>{member?.name}</Text>
              <TextInput
                style={[styles.customInput, { color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                placeholder="0.00"
                placeholderTextColor={theme.onSurfaceVariant}
                value={customAmounts[id] ?? ''}
                onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [id]: v }))}
                keyboardType="decimal-pad"
              />
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save button */}
      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : '✓ Save Expense'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
  },
  currencySymbol: { fontSize: 32, fontWeight: '300', marginRight: 4 },
  amountInput: { fontSize: 48, fontWeight: '800', minWidth: 120 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  catLabel: { fontSize: 13, fontWeight: '500' },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  memberChipText: { fontSize: 14, fontWeight: '500' },
  splitTypeRow: { flexDirection: 'row', gap: 10 },
  splitTypeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  splitTypeText: { fontSize: 14, fontWeight: '600' },
  splitPreview: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  splitPreviewText: { fontSize: 14 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customName: { width: 80, fontSize: 14, fontWeight: '500' },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
  },
  saveBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
