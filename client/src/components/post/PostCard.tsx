import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, ExternalLink, Share2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore, Post } from '../../store/feedStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { formatTimeAgo } from '../../lib/utils';
import api from '../../lib/api';

interface PostCardProps { post: Post; onComment?: (post: Post) => void; }

function SensitivityWrapper({ label, children }: { label: Post['sensitivity_label']; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (!label || revealed) return <>{children}</>;
  const LABEL_INFO = {
    spoiler: { emoji: '👀', text: 'Spoiler Alert' },
    sensitive: { emoji: '⚠️', text: 'Sensitive Content' },
    satire: { emoji: '😄', text: 'Satire' },
  };
  const info = LABEL_INFO[label];
  return (
    <div className="relative">
      <div className="blur-xl pointer-events-none select-none">{children}</div>
      <button
        onClick={() => setRevealed(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 rounded-xl"
      >
        <span className="text-4xl">{info.emoji}</span>
        <span className="text-sm font-semibold text-white">{info.text}</span>
        <span className="text-xs text-white/70 bg-white/10 px-3 py-1 rounded-full">Tap to view</span>
      </button>
    </div>
  );
}

function PollDisplay({ poll }: { poll: NonNullable<Post['poll']> }) {
  const [localPoll, setLocalPoll] = useState(poll);
  const user = useAuthStore(s => s.user);
  const isClosed = localPoll.closes_at < Math.floor(Date.now() / 1000);
  const hasVoted = !!localPoll.my_vote;

  const vote = async (optionId: string) => {
    if (hasVoted || isClosed) return;
    const { data } = await api.post(`/posts/${poll.id.split('|')[0]}/poll/vote`, { option_id: optionId });
    setLocalPoll(data.poll);
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold">{localPoll.question}</p>
      {localPoll.options.map(opt => {
        const pct = localPoll.total_votes > 0 ? Math.round((opt.vote_count / localPoll.total_votes) * 100) : 0;
        const isMyVote = localPoll.my_vote === opt.id;
        const showResults = hasVoted || isClosed;
        return (
          <button
            key={opt.id}
            onClick={() => vote(opt.id)}
            disabled={hasVoted || isClosed}
            className={`relative w-full text-left px-4 py-2.5 rounded-xl border transition-all overflow-hidden ${isMyVote ? 'border-primary text-primary' : 'border-border-light hover:border-primary/50'}`}
          >
            {showResults && (
              <div className="absolute inset-0 bg-primary/10 origin-left transition-all duration-700" style={{ width: `${pct}%` }} />
            )}
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-medium">{opt.option_text}</span>
              {showResults && <span className="text-xs text-text-muted">{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-text-faint">{localPoll.total_votes} votes {isClosed ? '· Poll ended' : ''}</p>
    </div>
  );
}

export function PostCard({ post, onComment }: PostCardProps) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);
  const { toggleLike, toggleBookmark } = useFeedStore();
  const currentUser = useAuthStore(s => s.user);

  const handleDoubleTap = () => {
    if (!post.is_liked) {
      toggleLike(post.id);
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 1000);
    }
  };

  return (
    <article className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar src={post.avatar_url} username={post.username} size="sm" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">{post.username}</span>
              {post.is_verified ? <span className="text-secondary text-xs">✓</span> : null}
            </div>
            {post.location && <p className="text-xs text-text-faint">{post.location}</p>}
          </div>
        </Link>
        <button className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Media carousel */}
      {post.media?.length > 0 && (
        <div className="relative bg-black" onDoubleClick={handleDoubleTap}>
          <SensitivityWrapper label={post.sensitivity_label}>
            <div className="relative overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${mediaIndex * 100}%)` }}
              >
                {post.media.map((m) => (
                  <div key={m.id} className="w-full flex-shrink-0">
                    <img
                      src={m.media_url}
                      alt="post"
                      className="w-full max-h-[600px] object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {post.media.length > 1 && (
                <>
                  {mediaIndex > 0 && (
                    <button onClick={() => setMediaIndex(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {mediaIndex < post.media.length - 1 && (
                    <button onClick={() => setMediaIndex(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {post.media.map((_, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === mediaIndex ? 'bg-white' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </SensitivityWrapper>

          {/* Double-tap heart animation */}
          <AnimatePresence>
            {likeAnim && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Heart size={80} fill="#F43F5E" className="text-accent drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <button
          onClick={() => toggleLike(post.id)}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${post.is_liked ? 'text-accent' : 'text-text-muted hover:text-text-primary'}`}
        >
          <Heart size={22} fill={post.is_liked ? '#F43F5E' : 'none'} strokeWidth={1.8} />
        </button>
        <button onClick={() => onComment?.(post)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-all active:scale-90">
          <MessageCircle size={22} strokeWidth={1.8} />
        </button>
        <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-all active:scale-90">
          <Share2 size={22} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => toggleBookmark(post.id)}
          className={`ml-auto p-1.5 rounded-lg transition-all active:scale-90 ${post.is_bookmarked ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          <Bookmark size={22} fill={post.is_bookmarked ? '#A855F7' : 'none'} strokeWidth={1.8} />
        </button>
      </div>

      {/* Counts */}
      <div className="px-4 pb-1">
        {post.likes_count > 0 && (
          <p className="text-sm font-semibold">{post.likes_count.toLocaleString()} {post.likes_count === 1 ? 'like' : 'likes'}</p>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-2">
          <p className="text-sm">
            <Link to={`/profile/${post.username}`} className="font-semibold hover:underline mr-1">{post.username}</Link>
            {post.caption}
          </p>
        </div>
      )}

      {/* Links */}
      {post.links?.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {post.links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-secondary hover:underline">
              <ExternalLink size={12} />
              {link.display_text}
            </a>
          ))}
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <div className="px-4 pb-3">
          <PollDisplay poll={post.poll} />
        </div>
      )}

      {/* Comments link & timestamp */}
      <div className="px-4 pb-4 space-y-1">
        {post.comments_count > 0 && (
          <button onClick={() => onComment?.(post)} className="text-sm text-text-muted hover:text-text-primary transition-colors">
            View all {post.comments_count} comments
          </button>
        )}
        <p className="text-xs text-text-faint">{formatTimeAgo(post.created_at)}</p>
      </div>
    </article>
  );
}
