import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Deployed API (Render). Used in release builds if EXPO_PUBLIC_API_URL is unset. */
const PRODUCTION_API_FALLBACK = 'https://lensifyserver.onrender.com';

/**
 * Backend API base URL.
 * - EXPO_PUBLIC_API_URL: override in .env if needed
 * - Physical device (Expo Go): use same host as Metro (your computer's LAN IP)
 * - Android Emulator: 10.0.2.2 to reach host machine
 * - iOS Simulator / web: localhost
 */
const getBaseUrl = (): string => {
  const envUrl = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Release builds (EAS/APK): prefer env; fall back to deployed Render API.
  if (!__DEV__) {
    return PRODUCTION_API_FALLBACK.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  // On physical device (Expo Go), Metro URL is e.g. 192.168.1.5:8081 — use that host for API
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export function apiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return base + p;
}
