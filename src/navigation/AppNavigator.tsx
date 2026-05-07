import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';

export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string };
  AddExpense: { groupId: string; expenseId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkAppTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0D1117' },
};

/**
 * Deep-link config. The `/g/<code>` URLs route to the Home screen, which
 * extracts the code via parseJoinUrl() and pre-fills the join modal — joining
 * a group always requires the user to confirm + name, never auto-navigates
 * to a group they're not a member of yet.
 */
const linking = {
  prefixes: ['divvy://', 'https://divvy.app'],
  config: {
    screens: {
      Home: '',
      Group: 'group/:groupId',
      AddExpense: 'group/:groupId/add',
    },
  },
};

export function AppNavigator() {
  const scheme = useColorScheme();
  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkAppTheme : DefaultTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
