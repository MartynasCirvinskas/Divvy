import 'react-native-reanimated';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ProfileProvider } from './src/contexts/ProfileContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <AppNavigator />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
