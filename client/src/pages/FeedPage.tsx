import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useFeedStore } from '../store/feedStore';
import { useNotifStore } from '../store/notifStore';
import { PostCard } from '../components/post/PostCard';
import { CommentsModal } from '../components/post/CommentsModal';
import { StoriesBar } from '../components/stories/StoriesBar';
import { SkeletonPost } from '../components/ui/SkeletonCard';
import { Spinner } from '../components/ui/Spinner';
import type { Post } from '../store/feedStore';

export default function FeedPage() {
  const { posts, isLoading, isRefreshing, hasMore, fetchFeed } = useFeedStore();
  const fetchNotifs = useNotifStore(s => s.fetch);
  const [commentPost, setCommentPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchFeed(true);
    fetchNotifs();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop < clientHeight + 300 && hasMore && !isLoading) {
      fetchFeed();
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3 py-4" onScroll={handleScroll}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h1 className="font-display text-2xl font-bold gradient-text">VibeGram</h1>
        <button
          onClick={() => fetchFeed(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stories */}
      <div className="mb-5">
        <StoriesBar />
      </div>

      {/* Posts */}
      {isLoading && posts.length === 0 ? (
        <div className="space-y-5">
          {[1, 2, 3].map(i => <SkeletonPost key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🌟</p>
          <h3 className="text-lg font-semibold mb-2">Your feed is empty</h3>
          <p className="text-text-muted text-sm">Follow people to see their posts here</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <PostCard post={post} onComment={setCommentPost} />
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-sm text-text-faint py-4">You're all caught up! 🎉</p>
          )}
        </div>
      )}

      <CommentsModal post={commentPost} onClose={() => setCommentPost(null)} />
    </div>
  );
}
