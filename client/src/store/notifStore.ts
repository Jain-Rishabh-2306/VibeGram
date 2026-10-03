import { create } from 'zustand';
import api from '../lib/api';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'poll_vote' | 'event_rsvp' | 'album_invite' | 'capsule_published';
  entity_id: string;
  entity_type: string;
  is_read: number;
  created_at: number;
  actor?: { id: string; username: string; avatar_url: string; full_name: string };
}

interface NotifState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/notifications');
      set({
        notifications: data.notifications,
        unreadCount: data.notifications.filter((n: Notification) => !n.is_read).length,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.patch('/notifications/read-all');
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: 1 })),
      unreadCount: 0,
    }));
  },
}));

