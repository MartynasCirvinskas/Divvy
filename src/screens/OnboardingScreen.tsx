import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  useColorScheme,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, useThemeColors } from '../theme/colors';
import { useProfile } from '../contexts/ProfileContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Page {
  emoji: string;
  title: string;
  body: string;
}

const PAGES: Page[] = [
  {
    emoji: '🤝',
    title: 'Create a group',
    body:
      'Start a group for a trip, apartment, dinner — anything shared. Share a 6-letter code and friends jump in. No accounts. No login.',
  },
  {
    emoji: '🧾',
    title: 'Add expenses',
    body:
      'Anyone can add an expense — split equally, by exact amount, or by percentage. Multi-currency works out of the box.',
  },
  {
    emoji: '⚖️',
    title: 'See who owes whom',
    body:
      'Divvy minimizes debts so the fewest payments settle the books. Tap "Mark settled" once you\'ve paid up.',
  },
];

export function OnboardingScreen() {
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { setName, setOnboarded } = useProfile();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [name, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) setPage(next);
  };

  const goNext = () => {
    if (page < PAGES.length) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setPage(next);
      Haptics.selectionAsync();
    }
  };

  const handleFinish = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await setName(trimmed);
      await setOnboarded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setBusy(false);
    }
  };

  const isNamePage = page === PAGES.length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + 16 },
      ]}
    >
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Text style={styles.emoji}>{p.emoji}</Text>
            <Text style={[styles.title, { color: theme.onBackground }]}>{p.title}</Text>
            <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>{p.body}</Text>
          </View>
        ))}
        {/* Final page — name capture */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={[styles.title, { color: theme.onBackground }]}>What&apos;s your name?</Text>
          <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>
            This is what your friends will see in groups.
          </Text>
          <TextInput
            style={[
              styles.nameInput,
              {
                color: theme.onSurface,
                borderColor: theme.border,
                backgroundColor: theme.inputBg,
              },
            ]}
            placeholder="Your name"
            placeholderTextColor={theme.onSurfaceVariant}
            value={name}
            onChangeText={setNameInput}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleFinish}
          />
        </View>
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.dots}>
        {[...PAGES, { title: 'name' }].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? COLORS.primary : theme.border },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 24 }]}>
        {isNamePage ? (
          <TouchableOpacity
            style={[styles.primaryBtn, (!name.trim() || busy) && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={!name.trim() || busy}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Setting up…' : 'Get started →'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji: { fontSize: 80, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  nameInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
