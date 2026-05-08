import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useGameSession } from '../hooks/useGameSession';
import { isParticipantTeam, teamLabel, computeWinner } from '../utils/scoring';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameSession'>;
  route: RouteProp<RootStackParamList, 'GameSession'>;
};

export function GameSessionScreen({ navigation, route }: Props) {
  const { groupId, sessionId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { group } = useGroup(groupId);
  const { session, loading, adjust, end, deleteSession } = useGameSession(groupId, sessionId);

  if (loading || !session) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const labelFor = (id: string): string => {
    if (isParticipantTeam(id)) return teamLabel(id);
    return group?.members?.[id]?.name ?? '?';
  };

  const handleAdjust = async (participantId: string, delta: number) => {
    Haptics.selectionAsync();
    try {
      await adjust(participantId, delta);
    } catch (e) {
      console.error('[adjust-score]', e);
    }
  };

  const handleEnd = () => {
    const winner = computeWinner(session.scores ?? {}, session.scoringDirection);
    if (!winner) {
      Alert.alert('No winner', 'Add some scores first.');
      return;
    }
    Alert.alert(
      'End game?',
      `Winner: ${labelFor(winner)} with ${session.scores[winner]} points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await end();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error('[end-game]', e);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete game?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSession();
            navigation.goBack();
          } catch (e) {
            console.error('[delete-game]', e);
          }
        },
      },
    ]);
  };

  // Sort participants by current score (best first based on direction)
  const sorted = [...session.participants].sort((a, b) => {
    const sa = session.scores[a] ?? 0;
    const sb = session.scores[b] ?? 0;
    return session.scoringDirection === 'high-wins' ? sb - sa : sa - sb;
  });

  const winner = session.endedAt
    ? session.winnerId
    : computeWinner(session.scores ?? {}, session.scoringDirection);

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
          <Text style={[styles.title, { color: theme.onBackground }]} numberOfLines={1}>
            {session.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {session.scoringDirection === 'high-wins' ? 'Most points wins' : 'Fewest points wins'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Text style={[styles.iconBtnText, { color: COLORS.danger }]}>🗑</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {sorted.map((p, i) => {
          const isWinner = p === winner;
          return (
            <View
              key={p}
              style={[
                styles.row,
                {
                  backgroundColor: theme.card,
                  borderColor: isWinner ? COLORS.primary : theme.border,
                  borderWidth: isWinner ? 2 : 1.5,
                },
              ]}
            >
              <Text style={[styles.rank, { color: theme.onSurfaceVariant }]}>{i + 1}</Text>
              <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
                {isWinner && !session.endedAt ? '👑 ' : ''}{labelFor(p)}
              </Text>
              <Text style={[styles.score, { color: COLORS.primary }]}>
                {session.scores[p] ?? 0}
              </Text>
              {!session.endedAt && (
                <View style={styles.btnCol}>
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.adjBtn, { borderColor: theme.border }]}
                      onPress={() => handleAdjust(p, -1)}
                    >
                      <Text style={[styles.adjText, { color: theme.onSurface }]}>−1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }]}
                      onPress={() => handleAdjust(p, 1)}
                    >
                      <Text style={[styles.adjText, { color: COLORS.primary }]}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }]}
                      onPress={() => handleAdjust(p, 5)}
                    >
                      <Text style={[styles.adjText, { color: COLORS.primary }]}>+5</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!session.endedAt ? (
        <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End Game</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.endedBanner, { backgroundColor: COLORS.primaryBg }]}>
          <Text style={[styles.endedText, { color: COLORS.primary }]}>
            🏆 {labelFor(session.winnerId ?? '')} won
          </Text>
        </View>
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
  iconBtn: { paddingHorizontal: 8 },
  iconBtnText: { fontSize: 18 },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  rank: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  score: { fontSize: 22, fontWeight: '800', minWidth: 50, textAlign: 'right' },
  btnCol: { flexDirection: 'column' },
  btnRow: { flexDirection: 'row', gap: 4 },
  adjBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  adjText: { fontSize: 13, fontWeight: '700' },
  endBtn: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  endedBanner: {
    margin: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  endedText: { fontSize: 16, fontWeight: '800' },
});
