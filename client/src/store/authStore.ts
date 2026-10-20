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
  token: string | null;
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
      token: typeof window !== 'undefined' ? localStorage.getItem('vibegram_token') : null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credential, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { credential, password });
          const token = data.accessToken || null;
          if (token && typeof window !== 'undefined') {
            localStorage.setItem('vibegram_token', token);
          }
          set({ user: data.user, token, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', formData);
          const token = data.accessToken || null;
          if (token && typeof window !== 'undefined') {
            localStorage.setItem('vibegram_token', token);
          }
          set({ user: data.user, token, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vibegram_token');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          if (data?.user) {
            set({ user: data.user, isAuthenticated: true });
          }
        } catch (err: any) {
          if (err?.response?.status === 401) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('vibegram_token');
            }
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },
    }),
    {
      name: 'vibegram-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

