'use client';

import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  language: string;
  darkMode: boolean;
  plan: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: 'login' | 'register' | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setShowAuthModal: (modal: 'login' | 'register' | null) => void;
  checkSession: () => Promise<void>;
  updateLanguage: (lang: string) => void;
  updateDarkMode: (dark: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  showAuthModal: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }
      const data = await res.json();
      set({ user: data.user, isAuthenticated: true, showAuthModal: null, isLoading: false });
      // Keep localStorage as offline fallback
      localStorage.setItem('vitalmind-session', JSON.stringify(data.user));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async (token: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Google login failed');
      }
      const data = await res.json();
      set({ user: data.user, isAuthenticated: true, showAuthModal: null, isLoading: false });
      localStorage.setItem('vitalmind-session', JSON.stringify(data.user));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      const data = await res.json();
      set({ user: data.user, isAuthenticated: true, showAuthModal: null, isLoading: false });
      // Keep localStorage as offline fallback
      localStorage.setItem('vitalmind-session', JSON.stringify(data.user));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if API call fails, clear local state
    }
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('vitalmind-session');
  },

  setShowAuthModal: (modal) => set({ showAuthModal: modal }),

  checkSession: async () => {
    try {
      // Try server session first (JWT cookie)
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true });
        localStorage.setItem('vitalmind-session', JSON.stringify(data.user));
        return;
      }
      // Server responded but session is invalid (401) - clear stale data
      localStorage.removeItem('vitalmind-session');
      set({ user: null, isAuthenticated: false });
    } catch {
      // Server unreachable (network error) - try localStorage fallback for offline support
      const saved = localStorage.getItem('vitalmind-session');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          set({ user, isAuthenticated: true });
        } catch {
          localStorage.removeItem('vitalmind-session');
        }
      }
    }
  },

  updateLanguage: (lang: string) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, language: lang };
      localStorage.setItem('vitalmind-session', JSON.stringify(updated));
      return { user: updated };
    });
  },

  updateDarkMode: (dark: boolean) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, darkMode: dark };
      localStorage.setItem('vitalmind-session', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));
