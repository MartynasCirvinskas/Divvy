// MUST be the first import — polyfills crypto.getRandomValues() globally so
// `uuid` works on Hermes. Without this, uuid.v4() throws at runtime.
import 'react-native-get-random-values';
import 'react-native-reanimated';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { GroupsProvider } from './src/contexts/GroupsContext';

function App() {
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

// `package.json` has `"main": "App.tsx"`, so this file is the entry point.
// Without registerRootComponent, Hermes loads the bundle but no root component
// is registered, causing: `Invariant Violation: "main" has not been registered`.
registerRootComponent(App);

export default App;
