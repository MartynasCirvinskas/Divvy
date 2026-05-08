import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { GameSession, ScoringDirection } from '../types';
import { useGroup } from '../hooks/useGroup';
import { useProfile } from '../contexts/ProfileContext';
import { createGameSession } from '../firebase/db';
import { makeTeamId, isParticipantTeam, teamLabel } from '../utils/scoring';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewGame'>;
  route: RouteProp<RootStackParamList, 'NewGame'>;
};

export function NewGameScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { group } = useGroup(groupId);
  const { profile } = useProfile();

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<ScoringDirection>('high-wins');
  const [participants, setParticipants] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState('');
  const [saving, setSaving] = useState(false);

  const members = Object.values(group?.members ?? {});
  const teams = participants.filter(isParticipantTeam);

  const toggleMember = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const addTeam = () => {
    const trimmed = teamInput.trim();
    if (!trimmed) return;
    const id = makeTeamId(trimmed);
    if (!participants.includes(id)) {
      setParticipants((p) => [...p, id]);
    }
    setTeamInput('');
  };

  const removeTeam = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p !== id));
  };

  const handleStart = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the game a name.');
      return;
    }
    if (participants.length < 2) {
      Alert.alert('Need at least 2 participants');
      return;
    }
    if (!profile) return;
    setSaving(true);
    try {
      const initialScores: Record<string, number> = {};
      participants.forEach((id) => {
        initialScores[id] = 0;
      });
      const session: GameSession = {
        id: uuidv4(),
        groupId,
        name: name.trim(),
        scoringDirection: direction,
        participants,
        scores: initialScores,
        createdAt: Date.now(),
        createdByDeviceId: profile.deviceId,
      };
      await createGameSession(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('GameSession', { groupId, sessionId: session.id });
    } catch (e) {
      console.error('[new-game]', e);
      Alert.alert('Could not start', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
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
        <Text style={[styles.title, { color: theme.onBackground }]}>New Game</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Name</Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface,
            borderColor: theme.border,
            backgroundColor: theme.inputBg,
          }]}
          placeholder="e.g. Catan, Alias night"
          placeholderTextColor={theme.onSurfaceVariant}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Scoring</Text>
        <View style={styles.row}>
          {(['high-wins', 'low-wins'] as ScoringDirection[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.optBtn,
                { borderColor: theme.border },
                direction === d && {
                  backgroundColor: COLORS.primaryBg,
                  borderColor: COLORS.primary,
                },
              ]}
              onPress={() => setDirection(d)}
            >
              <Text style={[
                styles.optText,
                { color: direction === d ? COLORS.primary : theme.onSurface },
              ]}>
                {d === 'high-wins' ? '⬆️ Most wins' : '⬇️ Fewest wins'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {members.length > 0 && (
          <>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Members</Text>
            <View style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    participants.includes(m.id) && {
                      backgroundColor: COLORS.primaryBg,
                      borderColor: COLORS.primary,
                    },
                  ]}
                  onPress={() => toggleMember(m.id)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: participants.includes(m.id) ? COLORS.primary : theme.onSurface },
                  ]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Or add teams</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="Team name"
            placeholderTextColor={theme.onSurfaceVariant}
            value={teamInput}
            onChangeText={setTeamInput}
            onSubmitEditing={addTeam}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addTeam}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {teams.length > 0 && (
          <View style={styles.chipRow}>
            {teams.map((id) => (
              <TouchableOpacity
                key={id}
                style={[styles.chip, { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary }]}
                onPress={() => removeTeam(id)}
              >
                <Text style={[styles.chipText, { color: COLORS.primary }]}>
                  {teamLabel(id)} ✕
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.startBtn,
          (saving || !name.trim() || participants.length < 2) && { opacity: 0.5 },
        ]}
        onPress={handleStart}
        disabled={saving || !name.trim() || participants.length < 2}
      >
        <Text style={styles.startBtnText}>{saving ? 'Starting…' : '▶ Start Game'}</Text>
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
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 8 },
  optBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  optText: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  startBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
