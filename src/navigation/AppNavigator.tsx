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

export function AppNavigator() {
  const scheme = useColorScheme();
  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkAppTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
