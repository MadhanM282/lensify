import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { apiFetchJson, ApiRequestError } from '@/constants/http';

const STORAGE_KEY = '@eyecare_auth';

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function saveAuth(user: User, token: string) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

async function clearAuth() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const { user: u, token: t } = JSON.parse(json);
        if (u && t) {
          setUser(u);
          setToken(t);
        }
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (!e || !password) return { ok: false, error: 'Email and password required' };
    try {
      const data = await apiFetchJson<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password }),
      });
      const { user: userData, token: newToken } = data;
      if (!userData || !newToken) return { ok: false, error: 'Invalid response' };
      await saveAuth(userData, newToken);
      setUser(userData);
      setToken(newToken);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Login failed';
      return { ok: false, error: message };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const e = email.trim().toLowerCase();
    if (!e || !password) return { ok: false, error: 'Email and password required' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
    try {
      const data = await apiFetchJson<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password, name: (name || e.split('@')[0]).trim() }),
      });
      const { user: userData, token: newToken } = data;
      if (!userData || !newToken) return { ok: false, error: 'Invalid response' };
      await saveAuth(userData, newToken);
      setUser(userData);
      setToken(newToken);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Registration failed';
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
