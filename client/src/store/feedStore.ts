import { create } from 'zustand';
import api from '../lib/api';

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'gif';
  order_index: number;
}

export interface PollOption {
  id: string;
  option_text: string;
  option_image_url: string;
  order_index: number;
  vote_count: number;
}

export interface Poll {
  id: string;
  question: string;
  closes_at: number;
  options: PollOption[];
  total_votes: number;
  my_vote: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  is_verified: number;
  caption: string;
  location: string;
  visibility: 'personal' | 'professional' | 'both';
  sensitivity_label: 'spoiler' | 'sensitive' | 'satire' | null;
  is_time_capsule: number;
  publish_at: number | null;
  is_published: number;
  created_at: number;
  media: PostMedia[];
  links: { id: string; url: string; display_text: string }[];
  poll: Poll | null;
  likes_count: number;
  comments_count: number;
  is_liked: number;
  is_bookmarked: number;
}

interface FeedState {
  posts: Post[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  viewerMode: 'personal' | 'professional';
  bookmarks: Post[];
  fetchFeed: (reset?: boolean) => Promise<void>;
  fetchBookmarks: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  addPost: (post: Post) => void;
  removePost: (postId: string) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  page: 1,
  hasMore: true,
  isLoading: false,
  isRefreshing: false,
  viewerMode: 'personal',
  bookmarks: [],

  fetchFeed: async (reset = false) => {
    const { isLoading, isRefreshing, page } = get();
    if (isLoading || isRefreshing) return;
    const nextPage = reset ? 1 : page;
    if (reset) set({ isRefreshing: true });
    else set({ isLoading: true });
    try {
      const { data } = await api.get(`/feed?page=${nextPage}`);
      set((s) => ({
        posts: reset ? data.posts : [...s.posts, ...data.posts],
        page: nextPage + 1,
        hasMore: data.hasMore,
        viewerMode: data.viewer_mode,
      }));
    } finally {
      set({ isLoading: false, isRefreshing: false });
    }
  },

  fetchBookmarks: async () => {
    const { data } = await api.get('/feed/bookmarks');
    set({ bookmarks: data.posts });
  },

  toggleLike: async (postId) => {
    // Optimistic update
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, is_liked: p.is_liked ? 0 : 1, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ),
    }));
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      // Revert on error
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? { ...p, is_liked: p.is_liked ? 0 : 1, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        ),
      }));
    }
  },

  toggleBookmark: async (postId) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, is_bookmarked: p.is_bookmarked ? 0 : 1 } : p
      ),
    }));
    try {
      await api.post(`/posts/${postId}/bookmark`);
    } catch {
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId ? { ...p, is_bookmarked: p.is_bookmarked ? 0 : 1 } : p
        ),
      }));
    }
  },

  addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),

  removePost: (postId) =>
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),
}));

