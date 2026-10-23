import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'midnight';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme: Theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
        set({ theme });
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: Theme =
          current === 'dark' ? 'light' : current === 'light' ? 'midnight' : 'dark';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
        }
        set({ theme: next });
      },
    }),
    {
      name: 'vibegram-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme && typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

// Immediately apply saved theme on initial script load to prevent flash
if (typeof document !== 'undefined') {
  try {
    const raw = localStorage.getItem('vibegram-theme');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.theme) {
        document.documentElement.setAttribute('data-theme', parsed.state.theme);
      }
    }
  } catch {}
}

