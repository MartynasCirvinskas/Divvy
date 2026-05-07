import 'react-native-reanimated';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { GroupsProvider } from './src/contexts/GroupsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <GroupsProvider>
          <AppNavigator />
        </GroupsProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
