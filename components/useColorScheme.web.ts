import { useTheme } from '@/context/ThemeContext';

/** App theme (light / dark), same as native — works with ThemeProvider on web. */
export function useColorScheme(): 'light' | 'dark' {
  return useTheme().colorScheme;
}
