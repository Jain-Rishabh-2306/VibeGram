import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website: string;
  is_private: number;
  is_verified: number;
  profile_mode: 'personal' | 'professional';
  created_at: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credential: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credential, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { credential, password });
          set({ user: data.user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', formData);
          set({ user: data.user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },
    }),
    {
      name: 'vibegram-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

