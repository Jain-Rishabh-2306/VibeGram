import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import api from '../lib/api';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'link' | 'location' | 'system';
  metadata: string | null;
  created_at: number;
  sender?: { id: string; username: string; avatar_url: string };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'event_group';
  event_id: string | null;
  created_at: number;
  other_user?: { id: string; username: string; full_name: string; avatar_url: string; is_verified: number };
  last_message?: Message;
  unread_count?: number;
}

interface ChatState {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: Message['message_type']) => void;
  setActiveConversation: (id: string | null) => void;
  startConversation: (userId: string) => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  isConnected: false,

  connect: (userId) => {
    if (get().socket?.connected) return;
    // Serverless platforms like Vercel Lambda do not support persistent WebSockets; REST fallback handles DMs
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return;
    }
    const socketUrl = import.meta.env.VITE_API_URL || '/';
    const socket = io(socketUrl, { withCredentials: true, transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('join', { userId });
    });

    socket.on('disconnect', () => set({ isConnected: false }));

    socket.on('new_message', (msg: Message) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [msg.conversation_id]: [...(s.messages[msg.conversation_id] || []), msg],
        },
        conversations: s.conversations.map((c) =>
          c.id === msg.conversation_id ? { ...c, last_message: msg } : c
        ),
      }));
    });

    socket.on('typing', ({ conversationId, username }: { conversationId: string; username: string }) => {
      set((s) => ({
        typingUsers: {
          ...s.typingUsers,
          [conversationId]: [...new Set([...(s.typingUsers[conversationId] || []), username])],
        },
      }));
      setTimeout(() => {
        set((s) => ({
          typingUsers: {
            ...s.typingUsers,
            [conversationId]: (s.typingUsers[conversationId] || []).filter((u) => u !== username),
          },
        }));
      }, 3000);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  fetchConversations: async () => {
    const { data } = await api.get('/messages/conversations');
    set({ conversations: data.conversations });
  },

  fetchMessages: async (conversationId) => {
    const { data } = await api.get(`/messages/conversations/${conversationId}/messages`);
    set((s) => ({ messages: { ...s.messages, [conversationId]: data.messages } }));
  },

  sendMessage: async (conversationId, content, type = 'text') => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('send_message', { conversationId, content, type });
    }

    try {
      const { data } = await api.post(`/messages/conversations/${conversationId}/messages`, {
        content,
        message_type: type,
      });
      if (data.message) {
        set((s) => {
          const currentList = s.messages[conversationId] || [];
          // Avoid duplicate if socket already delivered it
          if (currentList.some((m) => m.id === data.message.id)) return s;
          return {
            messages: {
              ...s.messages,
              [conversationId]: [...currentList, data.message],
            },
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, last_message: data.message } : c
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to send message via REST:', err);
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  startConversation: async (userId) => {
    const { data } = await api.post('/messages/conversations/direct', { target_user_id: userId });
    const { conversations } = get();
    // Refresh conversations list to get updated data
    const convsRes = await api.get('/messages/conversations');
    set({ conversations: convsRes.data.conversations });
    return data.conversation_id;
  },
}));
