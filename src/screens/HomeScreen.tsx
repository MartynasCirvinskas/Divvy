import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, Modal, StatusBar, useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { v4 as uuidv4 } from 'uuid';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Group } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGroup, getGroupByCode, addMember, GroupMeta } from '../firebase/db';
import { useProfile } from '../contexts/ProfileContext';
import { useGroups } from '../contexts/GroupsContext';
import { generateGroupCode } from '../utils/balances';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { parseJoinUrl } from '../utils/deeplink';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

const GROUP_EMOJIS = ['✈️','🏠','🎉','🍕','🍻','🎮','🏖️','🎄','💼','🚗','🏕️','🎵'];

type ModalType = 'create' | 'join' | null;

export function HomeScreen({ navigation }: Props) {
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { profile, addGroup } = useProfile();
  const { groups, addLocally } = useGroups();
  const myDeviceId = profile?.deviceId ?? '';
  const myName = profile?.name ?? '';
  const [modal, setModal] = useState<ModalType>(null);

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('✈️');
  const [currency, setCurrency] = useState('USD');

  // Join group form
  const [joinCode, setJoinCode] = useState('');

  // Listen for deep-link join URLs (cold-start + warm-app)
  React.useEffect(() => {
    const openWithCode = (url: string | null) => {
      if (!url) return;
      const code = parseJoinUrl(url);
      if (code) {
        setJoinCode(code);
        setModal('join');
      }
    };
    Linking.getInitialURL().then(openWithCode);
    const sub = Linking.addEventListener('url', ({ url }) => openWithCode(url));
    return () => sub.remove();
  }, []);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Name required', 'Give your group a name.');
      return;
    }
    if (!myDeviceId) {
      Alert.alert('Loading…', 'Try again in a moment.');
      return;
    }
    try {
      const code = generateGroupCode();
      const group: Group = {
        id: uuidv4(),
        code,
        name: groupName.trim(),
        emoji: groupEmoji,
        currency,
        members: {
          [myDeviceId]: { id: myDeviceId, name: myName, joinedAt: Date.now() },
        },
        expenses: {},
        createdAt: Date.now(),
      };
      await createGroup(group);
      await addGroup(group.id);
      addLocally({
        id: group.id,
        code: group.code,
        name: group.name,
        emoji: group.emoji,
        currency: group.currency,
        memberCount: 1,
        createdAt: group.createdAt,
      });
      setModal(null);
      setGroupName('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Group', { groupId: group.id });
    } catch (e) {
      console.error('[create-group]', e);
      Alert.alert('Could not create group', 'Check your connection and try again.');
    }
  };

  const handleJoinGroup = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Group codes are 6 characters long.');
      return;
    }
    if (!myDeviceId) {
      Alert.alert('Loading…', 'Try again in a moment.');
      return;
    }
    try {
      const found = await getGroupByCode(code);
      if (!found) {
        Alert.alert('Not found', 'No group with that code. Double-check and try again.');
        return;
      }
      if (found.members?.[myDeviceId]) {
        setModal(null);
        navigation.navigate('Group', { groupId: found.id });
        return;
      }
      await addMember(found.id, { id: myDeviceId, name: myName, joinedAt: Date.now() });
      await addGroup(found.id);
      addLocally({
        id: found.id,
        code: found.code,
        name: found.name,
        emoji: found.emoji,
        currency: found.currency,
        memberCount: Object.keys(found.members ?? {}).length + 1,
        createdAt: found.createdAt,
      });
      setModal(null);
      setJoinCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Group', { groupId: found.id });
    } catch (e) {
      console.error('[join-group]', e);
      Alert.alert('Could not join', 'Check your connection and try again.');
    }
  };

  const renderGroup = ({ item }: { item: GroupMeta }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate('Group', { groupId: item.id })}
    >
      <Text style={styles.groupEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.groupName, { color: theme.onSurface }]}>{item.name}</Text>
        <Text style={[styles.groupMeta, { color: theme.onSurfaceVariant }]}>
          {item.memberCount} members · {item.currency}
        </Text>
      </View>
      <Text style={{ color: theme.onSurfaceVariant, fontSize: 20 }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: theme.onBackground }]}>🫙 EvenJar</Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {myName ? `Hey, ${myName}` : 'Split expenses fairly'}
          </Text>
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={[styles.emptyTitle, { color: theme.onBackground }]}>No groups yet</Text>
          <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
            Create a group for a trip, apartment or dinner — then invite friends with a 6-letter code.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB row */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fabSecondary, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setModal('join')}
        >
          <Text style={[styles.fabSecondaryText, { color: theme.onSurface }]}>🔗 Join</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => setModal('create')}>
          <Text style={styles.fabText}>＋ Create Group</Text>
        </TouchableOpacity>
      </View>

      {/* Create group modal */}
      <Modal visible={modal === 'create'} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(null)} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: theme.onBackground }]}>New Group</Text>

          <TextInput
            style={[styles.input, { color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="Group name (e.g. Bali Trip 2026)"
            placeholderTextColor={theme.onSurfaceVariant}
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>Icon</Text>
          <View style={styles.emojiGrid}>
            {GROUP_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, groupEmoji === e && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary }]}
                onPress={() => setGroupEmoji(e)}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>Currency</Text>
          <View style={styles.currencyRow}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyBtn, { borderColor: theme.border },
                  currency === c && { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary }]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[{ fontSize: 13, fontWeight: '600' }, { color: currency === c ? COLORS.primary : theme.onSurface }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateGroup}>
            <Text style={styles.primaryBtnText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Join group modal */}
      <Modal visible={modal === 'join'} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(null)} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: theme.onBackground }]}>Join a Group</Text>
          <Text style={[styles.sheetSub, { color: theme.onSurfaceVariant }]}>
            Ask a friend for their 6-letter group code
          </Text>
          <TextInput
            style={[styles.codeInput, { color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="XXXXXX"
            placeholderTextColor={theme.onSurfaceVariant}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoFocus
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinGroup}>
            <Text style={styles.primaryBtnText}>Join Group →</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  groupEmoji: { fontSize: 28 },
  groupName: { fontSize: 16, fontWeight: '700' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fabRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  fabSecondary: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSecondaryText: { fontSize: 15, fontWeight: '600' },
  fab: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#000', fontSize: 15, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    gap: 14,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#555', alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sheetSub: { fontSize: 13, textAlign: 'center', marginTop: -8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  codeInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
