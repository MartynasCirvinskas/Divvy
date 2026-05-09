import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, StatusBar, useColorScheme, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGroup } from '../hooks/useGroup';
import { useWishlist } from '../hooks/useWishlist';
import { useProfile } from '../contexts/ProfileContext';
import { COLORS, useThemeColors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddWishItem'>;
  route: RouteProp<RootStackParamList, 'AddWishItem'>;
};

export function AddWishItemScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const theme = useThemeColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { group } = useGroup(groupId);
  const myId = profile?.deviceId ?? '';
  const { addItem } = useWishlist(groupId, myId, myId);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [priceText, setPriceText] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = group?.currency ?? 'USD';

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give the wish a name.');
      return;
    }
    setSaving(true);
    try {
      // Parse price: accept "12.34" or "12,34" or "12" → cents (1234, 1234, 1200)
      const cleaned = priceText.trim().replace(',', '.');
      let priceCents: number | undefined;
      if (cleaned !== '') {
        const f = parseFloat(cleaned);
        if (Number.isFinite(f) && f >= 0) {
          priceCents = Math.round(f * 100);
        }
      }
      await addItem({
        title: title.trim(),
        url: url.trim() || undefined,
        priceCents,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.error('[wishlist:add]', e);
      Alert.alert('Could not save', 'Check your connection and try again.');
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
        <Text style={[styles.title, { color: theme.onBackground }]}>Add a wish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>What do you want?</Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="e.g. Camera bag"
          placeholderTextColor={theme.onSurfaceVariant}
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={120}
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Link (optional)</Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="https://amazon.de/..."
          placeholderTextColor={theme.onSurfaceVariant}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
          Approx. price ({currency}, optional)
        </Text>
        <TextInput
          style={[styles.input, {
            color: theme.onSurface, borderColor: theme.border, backgroundColor: theme.inputBg,
          }]}
          placeholder="45"
          placeholderTextColor={theme.onSurfaceVariant}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="decimal-pad"
        />
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveBtn, (saving || !title.trim()) && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving || !title.trim()}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save wish'}</Text>
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
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
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
