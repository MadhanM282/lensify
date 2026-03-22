import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

const STORAGE_KEY = '@lensify_theme';

export type AppColorScheme = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: AppColorScheme;
  setColorScheme: (s: AppColorScheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function systemScheme(): AppColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<AppColorScheme>(systemScheme);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      if (v === 'light' || v === 'dark') setColorSchemeState(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setColorScheme = useCallback((s: AppColorScheme) => {
    setColorSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setColorSchemeState((prev) => {
      const next: AppColorScheme = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ colorScheme, setColorScheme, toggleTheme }),
    [colorScheme, setColorScheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
