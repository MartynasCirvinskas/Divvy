import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { AddWishItemScreen } from '../screens/AddWishItemScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { NewGameScreen } from '../screens/NewGameScreen';
import { GameSessionScreen } from '../screens/GameSessionScreen';
import { useProfile } from '../contexts/ProfileContext';
import { COLORS } from '../theme/colors';

export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string };
  AddExpense: { groupId: string; expenseId?: string };
  AddWishItem: { groupId: string };
  NewGame: { groupId: string };
  GameSession: { groupId: string; sessionId: string };
};

export type OnboardingParamList = {
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingParamList>();

const DarkAppTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0D1117' },
};

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
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scheme === 'dark' ? '#0D1117' : '#F6F8FA',
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const navTheme = scheme === 'dark' ? DarkAppTheme : DefaultTheme;
  const onboarded = profile?.onboarded === true && !!profile.name;

  if (!onboarded) {
    return (
      <NavigationContainer theme={navTheme}>
        <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
          <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
        </OnboardingStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="AddWishItem" component={AddWishItemScreen} />
        <Stack.Screen name="NewGame" component={NewGameScreen} />
        <Stack.Screen name="GameSession" component={GameSessionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
