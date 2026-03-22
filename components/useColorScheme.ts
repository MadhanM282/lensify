import { useTheme } from '@/context/ThemeContext';

/** App theme (light / dark), controlled by ThemeProvider + toggle — not raw system appearance. */
export function useColorScheme(): 'light' | 'dark' {
  return useTheme().colorScheme;
}
