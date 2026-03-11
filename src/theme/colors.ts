import { useColorScheme } from 'react-native';

export const COLORS = {
  primary: '#00D4AA',      // teal-green (money vibe)
  primaryDim: '#00A882',
  primaryBg: '#00D4AA22',
  danger: '#FF4D6A',
  dangerBg: '#FF4D6A22',
  warning: '#FFB800',
  success: '#00D4AA',

  // Dark
  darkBg: '#0D1117',
  darkSurface: '#161B22',
  darkCard: '#1C2128',
  darkBorder: '#30363D',

  // Light
  lightBg: '#F6F8FA',
  lightSurface: '#FFFFFF',
  lightCard: '#F0F2F5',
  lightBorder: '#D0D7DE',

  white: '#FFFFFF',
  gray300: '#8B949E',
  gray500: '#6E7681',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  border: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  inputBg: string;
}

export function useThemeColors(): ThemeColors {
  const dark = useColorScheme() === 'dark';
  return {
    background:        dark ? COLORS.darkBg      : COLORS.lightBg,
    surface:           dark ? COLORS.darkSurface  : COLORS.lightSurface,
    card:              dark ? COLORS.darkCard      : COLORS.lightCard,
    border:            dark ? COLORS.darkBorder    : COLORS.lightBorder,
    onBackground:      dark ? COLORS.white         : '#0D1117',
    onSurface:         dark ? '#E6EDF3'            : '#1C2128',
    onSurfaceVariant:  dark ? COLORS.gray300       : COLORS.gray500,
    outline:           dark ? '#30363D'            : '#C8D0DA',
    inputBg:           dark ? '#161B22'            : '#FFFFFF',
  };
}
