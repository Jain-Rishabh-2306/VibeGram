import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Grid, Bookmark, Settings, UserPlus, UserMinus, MessageCircle, Lock, BadgeCheck, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { SkeletonProfile } from '../components/ui/SkeletonCard';
import { Spinner } from '../components/ui/Spinner';
import { formatNumber } from '../lib/utils';
import { useChatStore } from '../store/chatStore';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';

interface ProfileUser {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website: string;
  is_private: number;
  is_verified: number;
  profile_mode: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_own_profile: number;
  follow_status: 'pending' | 'accepted' | null;
}

interface ProfilePost {
  id: string;
  thumbnail: string;
  likes_count: number;
  comments_count: number;
  sensitivity_label: string | null;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const currentUser = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'bookmarks'>('posts');
  const [isModeSwitching, setIsModeSwitching] = useState(false);
  const { startConversation } = useChatStore();
  const navigate = useNavigate();
  const { add: toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast('Logged out successfully', 'info');
      navigate('/login');
    } catch {
      toast('Failed to log out', 'error');
    }
  };

  const handleToggleMode = async () => {
    if (!profile || isModeSwitching) return;
    const nextMode = profile.profile_mode === 'personal' ? 'professional' : 'personal';
    setIsModeSwitching(true);
    try {
      await api.patch('/users/me/profile-mode', { mode: nextMode });
      setProfile((prev) => (prev ? { ...prev, profile_mode: nextMode } : prev));
      useAuthStore.getState().updateUser({ profile_mode: nextMode });
      toast(`Switched to ${nextMode} mode`, 'success');
    } catch {
      toast('Failed to switch mode', 'error');
    } finally {
      setIsModeSwitching(false);
    }
  };

  useEffect(() => {
    if (!username) return;
    setIsLoading(true);
    Promise.all([
      api.get(`/users/${username}`),
      api.get(`/users/${username}/posts`),
    ]).then(([profileRes, postsRes]) => {
      setProfile(profileRes.data.user);
      setPosts(postsRes.data.posts);
    }).catch(() => {
      toast('User not found', 'error');
    }).finally(() => setIsLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!profile) return;
    setIsFollowLoading(true);
    try {
      const { data } = await api.post(`/users/${profile.id}/follow`);
      setProfile(prev => prev ? {
        ...prev,
        follow_status: data.action === 'followed' ? 'accepted' : data.action === 'requested' ? 'pending' : null,
        followers_count: data.action === 'followed' ? prev.followers_count + 1 : data.action === 'unfollowed' ? prev.followers_count - 1 : prev.followers_count,
      } : prev);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    try {
      const convId = await startConversation(profile.id);
      navigate(`/messages/${convId}`);
    } catch {
      toast('Could not open conversation', 'error');
    }
  };

  if (isLoading) return <SkeletonProfile />;
  if (!profile) return <div className="flex items-center justify-center h-64 text-text-muted">User not found</div>;

  const isOwn = !!profile.is_own_profile;
  const isFollowing = profile.follow_status === 'accepted';
  const isPending = profile.follow_status === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-6 mb-6">
        <Avatar src={profile.avatar_url} username={profile.username} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{profile.username}</h1>
              {profile.is_verified ? <BadgeCheck size={18} className="text-secondary" /> : null}
              {profile.is_private ? <Lock size={14} className="text-text-faint" /> : null}
            </div>
            {isOwn ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/settings/profile" className="btn-secondary text-sm py-1.5 px-3">
                  Edit Profile
                </Link>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  disabled={isModeSwitching}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                  title="Click to switch personal/professional mode"
                >
                  {profile.profile_mode === 'professional' ? '💼 Professional Mode' : '🌐 Personal Mode'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-accent/40 text-accent hover:bg-accent/10 transition-colors"
                  title="Log out of VibeGram"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  className={`${isFollowing || isPending ? 'btn-secondary' : 'btn-primary'} text-sm py-1.5 px-4 flex items-center gap-1.5`}
                >
                  {isFollowLoading ? <Spinner size="sm" /> : isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                  {isPending ? 'Requested' : isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onClick={handleMessage} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mb-3">
            {[
              { label: 'posts', value: profile.posts_count },
              { label: 'followers', value: profile.followers_count },
              { label: 'following', value: profile.following_count },
            ].map(({ label, value }) => (
              <button key={label} className="text-center hover:opacity-70 transition-opacity">
                <p className="font-bold">{formatNumber(value)}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </button>
            ))}
          </div>

          <div>
            <p className="font-semibold text-sm">{profile.full_name}</p>
            {profile.bio && <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:underline mt-0.5 block">
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        {[
          { id: 'posts' as const, icon: Grid, label: 'Posts' },
          ...(isOwn ? [{ id: 'bookmarks' as const, icon: Bookmark, label: 'Saved' }] : []),
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {profile.is_private && !isOwn && !isFollowing ? (
        <div className="text-center py-16">
          <Lock size={40} className="mx-auto text-text-faint mb-3" />
          <p className="font-semibold">This account is private</p>
          <p className="text-sm text-text-muted mt-1">Follow to see their posts</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <Link key={post.id} to={`/posts/${post.id}`} className="relative aspect-square group overflow-hidden rounded-sm">
              <img
                src={post.thumbnail}
                alt="post"
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${post.sensitivity_label ? 'blur-md' : ''}`}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <span className="text-white text-sm font-semibold flex items-center gap-1">
                  ♥ {formatNumber(post.likes_count)}
                </span>
                <span className="text-white text-sm font-semibold flex items-center gap-1">
                  💬 {formatNumber(post.comments_count)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📷</p>
          <p className="font-semibold">No posts yet</p>
        </div>
      )}
    </div>
  );
}
