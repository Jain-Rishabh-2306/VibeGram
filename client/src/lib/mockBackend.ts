import { AxiosRequestConfig, AxiosResponse } from 'axios';

// Local storage keys
const USERS_KEY = 'vibegram_mock_users';
const POSTS_KEY = 'vibegram_mock_posts';
const CURRENT_USER_KEY = 'vibegram_mock_current_user';
const EVENTS_KEY = 'vibegram_mock_events';
const ALBUMS_KEY = 'vibegram_mock_albums';
const NOTIFS_KEY = 'vibegram_mock_notifs';

// Initial seed posts
const SEED_POSTS = [
  {
    id: 'post-1',
    user_id: 'user-elena',
    username: 'elena_cyber',
    full_name: 'Elena Rostova',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_verified: 1,
    caption: 'Neon dreams in Neo-Tokyo. Loving the new cyber vibe! 💜⚡ #cyberpunk #neon #tokyo',
    location: 'Shibuya, Tokyo',
    visibility: 'both',
    sensitivity_label: null,
    is_time_capsule: 0,
    publish_at: null,
    is_published: 1,
    created_at: Math.floor(Date.now() / 1000) - 3600,
    media: [
      {
        id: 'm-1',
        post_id: 'post-1',
        media_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
        media_type: 'image',
        order_index: 0,
      },
    ],
    links: [{ id: 'l-1', url: 'https://unsplash.com', display_text: 'View high-res photoshoot' }],
    poll: {
      id: 'poll-1',
      question: 'Which lighting fits the cyber vibe better?',
      closes_at: Math.floor(Date.now() / 1000) + 86400,
      options: [
        { id: 'opt-1', option_text: '💜 Ultraviolet Purple', option_image_url: '', order_index: 0, vote_count: 42 },
        { id: 'opt-2', option_text: '🩵 Electric Cyan', option_image_url: '', order_index: 1, vote_count: 58 },
      ],
      total_votes: 100,
      my_vote: null,
    },
    likes_count: 342,
    comments_count: 18,
    is_liked: 0,
    is_bookmarked: 0,
  },
  {
    id: 'post-2',
    user_id: 'user-marcus',
    username: 'marcus_vibe',
    full_name: 'Marcus Vance',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    is_verified: 1,
    caption: 'Sneak peek at our upcoming design system release! What do you think? 🔥',
    location: 'Bangalore, India',
    visibility: 'both',
    sensitivity_label: 'spoiler',
    is_time_capsule: 0,
    publish_at: null,
    is_published: 1,
    created_at: Math.floor(Date.now() / 1000) - 7200,
    media: [
      {
        id: 'm-2',
        post_id: 'post-2',
        media_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
        media_type: 'image',
        order_index: 0,
      },
    ],
    links: [],
    poll: null,
    likes_count: 215,
    comments_count: 9,
    is_liked: 0,
    is_bookmarked: 0,
  },
  {
    id: 'post-3',
    user_id: 'user-zara',
    username: 'zara.arts',
    full_name: 'Zara Chen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    is_verified: 0,
    caption: 'Late night generative 3D renders with Blender & Three.js 🌌✨',
    location: 'Design Studio',
    visibility: 'both',
    sensitivity_label: null,
    is_time_capsule: 0,
    publish_at: null,
    is_published: 1,
    created_at: Math.floor(Date.now() / 1000) - 14400,
    media: [
      {
        id: 'm-3',
        post_id: 'post-3',
        media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        media_type: 'image',
        order_index: 0,
      },
    ],
    links: [],
    poll: null,
    likes_count: 189,
    comments_count: 14,
    is_liked: 0,
    is_bookmarked: 0,
  },
];

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode
  }
}

function mockResponse(data: any, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

export async function handleMockRequest(config: AxiosRequestConfig): Promise<AxiosResponse | null> {
  const url = config.url || '';
  const method = (config.method || 'GET').toUpperCase();
  const body = config.data
    ? typeof config.data === 'string'
      ? (() => { try { return JSON.parse(config.data); } catch { return {}; } })()
      : config.data
    : {};

  // 1. Auth: Register
  if (url.includes('/auth/register') && method === 'POST') {
    const { username, email, full_name } = body;
    const user = {
      id: `user-${Date.now()}`,
      username: username || 'vibegrammer',
      email: email || 'user@example.com',
      full_name: full_name || username || 'VibeGram User',
      bio: 'Just vibing on VibeGram ✨',
      avatar_url: '',
      website: '',
      is_private: 0,
      is_verified: 0,
      profile_mode: 'personal',
      created_at: Math.floor(Date.now() / 1000),
    };
    const users = getStored<any[]>(USERS_KEY, []);
    users.push(user);
    setStored(USERS_KEY, users);
    setStored(CURRENT_USER_KEY, user);
    return mockResponse({ success: true, user, accessToken: 'demo-token' }, 201);
  }

  // 2. Auth: Login
  if (url.includes('/auth/login') && method === 'POST') {
    const { credential } = body;
    const users = getStored<any[]>(USERS_KEY, []);
    let user = users.find((u) => u.username === credential || u.email === credential);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        username: credential || 'vibegrammer',
        email: `${credential}@example.com`,
        full_name: credential || 'VibeGram User',
        bio: 'Just vibing on VibeGram ✨',
        avatar_url: '',
        website: '',
        is_private: 0,
        is_verified: 0,
        profile_mode: 'personal',
        created_at: Math.floor(Date.now() / 1000),
      };
      users.push(user);
      setStored(USERS_KEY, users);
    }
    setStored(CURRENT_USER_KEY, user);
    return mockResponse({ success: true, user, accessToken: 'demo-token' });
  }

  // 3. Auth: Me
  if (url.includes('/auth/me') && method === 'GET') {
    const user = getStored<any>(CURRENT_USER_KEY, null);
    if (user) {
      return mockResponse({ success: true, user });
    }
    return mockResponse({ success: false, message: 'Not logged in' }, 401);
  }

  // 4. Auth: Logout
  if (url.includes('/auth/logout')) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return mockResponse({ success: true });
  }

  // 5. Feed
  if (url.includes('/feed') && method === 'GET') {
    const customPosts = getStored<any[]>(POSTS_KEY, []);
    const allPosts = [...customPosts, ...SEED_POSTS];
    return mockResponse({
      success: true,
      posts: allPosts,
      hasMore: false,
      viewer_mode: 'personal',
    });
  }

  // 6. Stories
  if (url.includes('/stories/feed')) {
    return mockResponse({
      success: true,
      stories: [
        {
          user_id: 'user-elena',
          username: 'elena_cyber',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          stories: [{ id: 's1', media_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' }],
        },
        {
          user_id: 'user-marcus',
          username: 'marcus_vibe',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          stories: [{ id: 's2', media_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800' }],
        },
        {
          user_id: 'user-zara',
          username: 'zara.arts',
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          stories: [{ id: 's3', media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' }],
        },
      ],
    });
  }

  // 7. Create Post
  if (url === '/posts' && method === 'POST') {
    const user = getStored<any>(CURRENT_USER_KEY, { username: 'you', full_name: 'You' });
    let caption = '';
    let location = '';
    let visibility = 'both';
    let sensitivity_label = null;
    let poll = null;

    if (body instanceof FormData) {
      caption = (body.get('caption') as string) || '';
      location = (body.get('location') as string) || '';
      visibility = (body.get('visibility') as string) || 'both';
      sensitivity_label = (body.get('sensitivity_label') as any) || null;
      const pollQ = body.get('poll_question') as string;
      const pollOpts = body.get('poll_options') as string;
      if (pollQ && pollOpts) {
        try {
          const opts = JSON.parse(pollOpts);
          poll = {
            id: `poll-${Date.now()}`,
            question: pollQ,
            closes_at: Math.floor(Date.now() / 1000) + 86400,
            options: opts.map((t: string, idx: number) => ({
              id: `opt-${idx}`,
              option_text: t,
              vote_count: 0,
              order_index: idx,
            })),
            total_votes: 0,
            my_vote: null,
          };
        } catch { /* skip */ }
      }
    }

    const newPost = {
      id: `post-${Date.now()}`,
      user_id: user.id || 'me',
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url || '',
      is_verified: 0,
      caption,
      location,
      visibility,
      sensitivity_label,
      is_time_capsule: 0,
      publish_at: null,
      is_published: 1,
      created_at: Math.floor(Date.now() / 1000),
      media: [
        {
          id: `m-${Date.now()}`,
          post_id: `post-${Date.now()}`,
          media_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
          media_type: 'image',
          order_index: 0,
        },
      ],
      links: [],
      poll,
      likes_count: 0,
      comments_count: 0,
      is_liked: 0,
      is_bookmarked: 0,
    };

    const currentPosts = getStored<any[]>(POSTS_KEY, []);
    setStored(POSTS_KEY, [newPost, ...currentPosts]);
    return mockResponse({ success: true, post: newPost }, 201);
  }

  // 8. Like / Bookmark Post
  if (url.match(/\/posts\/.*\/like/)) {
    return mockResponse({ success: true, liked: true });
  }
  if (url.match(/\/posts\/.*\/bookmark/)) {
    return mockResponse({ success: true, bookmarked: true });
  }

  // 9. Post Comments
  if (url.match(/\/posts\/.*\/comments/)) {
    if (method === 'POST') {
      const user = getStored<any>(CURRENT_USER_KEY, { username: 'you' });
      return mockResponse({
        success: true,
        comment: {
          id: `c-${Date.now()}`,
          user_id: user.id || 'me',
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url || '',
          content: body.content || '',
          created_at: Math.floor(Date.now() / 1000),
          reply_count: 0,
        },
      }, 201);
    }
    return mockResponse({
      success: true,
      comments: [
        {
          id: 'c-1',
          username: 'elena_cyber',
          full_name: 'Elena Rostova',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          content: 'This aesthetic is stunning! 🔥',
          created_at: Math.floor(Date.now() / 1000) - 1800,
          reply_count: 0,
        },
      ],
    });
  }

  // 10. Notifications
  if (url.includes('/notifications')) {
    if (method === 'PATCH') return mockResponse({ success: true });
    return mockResponse({
      success: true,
      notifications: [
        {
          id: 'notif-1',
          type: 'like',
          actor: { username: 'elena_cyber', full_name: 'Elena Rostova', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
          is_read: 0,
          created_at: Math.floor(Date.now() / 1000) - 900,
        },
        {
          id: 'notif-2',
          type: 'follow',
          actor: { username: 'marcus_vibe', full_name: 'Marcus Vance', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
          is_read: 0,
          created_at: Math.floor(Date.now() / 1000) - 3600,
        },
      ],
    });
  }

  // 11. Explore
  if (url.includes('/explore')) {
    return mockResponse({
      success: true,
      posts: SEED_POSTS.map((p) => ({
        id: p.id,
        thumbnail: p.media[0]?.media_url,
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        sensitivity_label: p.sensitivity_label,
      })),
      trending_hashtags: [
        { tag: 'cyberpunk', post_count: 1420 },
        { tag: 'vibegram', post_count: 980 },
        { tag: 'neonvibes', post_count: 750 },
        { tag: 'designsystem', post_count: 512 },
      ],
      results: [],
    });
  }

  // 12. Events
  if (url.includes('/events')) {
    if (method === 'POST') {
      const user = getStored<any>(CURRENT_USER_KEY, { username: 'you' });
      const newEv = {
        id: `ev-${Date.now()}`,
        title: body.title,
        location_name: body.location_name,
        event_date: body.event_date || Math.floor(Date.now() / 1000) + 86400,
        description: body.description || '',
        creator_username: user.username,
        creator_name: user.full_name,
        creator_avatar: user.avatar_url || '',
        going_count: 1,
        my_rsvp: 'going',
      };
      const events = getStored<any[]>(EVENTS_KEY, []);
      setStored(EVENTS_KEY, [newEv, ...events]);
      return mockResponse({ success: true, event: newEv }, 201);
    }
    const storedEvents = getStored<any[]>(EVENTS_KEY, []);
    return mockResponse({
      success: true,
      events: storedEvents.length > 0 ? storedEvents : [
        {
          id: 'ev-1',
          title: 'Cyberpunk Art & Tech Mixer',
          location_name: 'WeWork Galaxy, Residency Rd',
          event_date: Math.floor(Date.now() / 1000) + 172800,
          description: 'Meet fellow creators, designers and devs. Drinks on us!',
          creator_username: 'elena_cyber',
          creator_name: 'Elena Rostova',
          creator_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          going_count: 24,
          my_rsvp: null,
        },
      ],
    });
  }

  // 13. Albums
  if (url.includes('/albums')) {
    if (method === 'POST') {
      const newAlbum = {
        id: `alb-${Date.now()}`,
        title: body.title,
        description: body.description || '',
        cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
        role: 'owner',
        media_count: 1,
        member_count: 1,
      };
      const albums = getStored<any[]>(ALBUMS_KEY, []);
      setStored(ALBUMS_KEY, [newAlbum, ...albums]);
      return mockResponse({ success: true, album: newAlbum }, 201);
    }
    const storedAlbums = getStored<any[]>(ALBUMS_KEY, []);
    return mockResponse({
      success: true,
      albums: storedAlbums.length > 0 ? storedAlbums : [
        {
          id: 'alb-1',
          title: 'Neo-Tokyo Memories 2026',
          description: 'Trip photos & night wanderings',
          cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
          role: 'owner',
          media_count: 14,
          member_count: 3,
        },
      ],
    });
  }

  // 14. Messages / Conversations
  if (url.includes('/messages/conversations')) {
    return mockResponse({
      success: true,
      conversations: [
        {
          id: 'conv-1',
          other_user: {
            username: 'elena_cyber',
            full_name: 'Elena Rostova',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          },
          last_message: { content: 'See you at the meetup!', created_at: Math.floor(Date.now() / 1000) - 1200 },
        },
      ],
      messages: [],
    });
  }

  // 15. User Profile
  if (url.match(/\/users\/[^\/]+$/) && method === 'GET') {
    const username = url.split('/').pop();
    const currentUser = getStored<any>(CURRENT_USER_KEY, { username: 'you' });
    const isMe = username === currentUser.username;
    return mockResponse({
      success: true,
      user: {
        id: isMe ? currentUser.id : `user-${username}`,
        username,
        full_name: isMe ? currentUser.full_name : username,
        bio: isMe ? (currentUser.bio || 'VibeGrammer ✨') : 'Digital creator & aesthetic enthusiast 🌌',
        avatar_url: isMe ? currentUser.avatar_url : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        website: 'https://vibegram.app',
        is_private: 0,
        is_verified: 1,
        profile_mode: 'personal',
        followers_count: 1420,
        following_count: 280,
        posts_count: 12,
        is_own_profile: isMe ? 1 : 0,
        follow_status: isMe ? null : 'accepted',
      },
    });
  }

  if (url.match(/\/users\/[^\/]+\/posts$/) && method === 'GET') {
    const customPosts = getStored<any[]>(POSTS_KEY, []);
    return mockResponse({
      success: true,
      posts: [...customPosts, ...SEED_POSTS].map((p) => ({
        id: p.id,
        thumbnail: p.media[0]?.media_url,
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        sensitivity_label: p.sensitivity_label,
      })),
    });
  }

  // Default fallback
  return mockResponse({ success: true });
}

