import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Hash, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '../components/ui/Spinner';
import api from '../lib/api';

interface ExplorePost { id: string; thumbnail: string; likes_count: number; comments_count: number; sensitivity_label: string | null; }
interface TrendingHashtag { tag: string; post_count: number; }

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get('/explore').then(({ data }) => {
      setPosts(data.posts || []);
      setHashtags(data.trending_hashtags || []);
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/explore/search?q=${encodeURIComponent(query)}`);
        setSearchResults(data.results || []);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5">Explore</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users, hashtags..."
          className="input-field pl-10"
        />
        {isSearching && <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>

      {/* Search results */}
      {query.trim() && searchResults.length > 0 && (
        <div className="card mb-6 divide-y divide-border">
          {searchResults.map((r: any) => (
            <Link key={r.id} to={r.type === 'user' ? `/profile/${r.username}` : `/explore?tag=${r.tag}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors">
              {r.type === 'user' ? (
                <>
                  {r.avatar_url ? <img src={r.avatar_url} className="w-10 h-10 rounded-full object-cover" alt={r.username} /> : <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold">{r.username[0].toUpperCase()}</div>}
                  <div>
                    <p className="font-semibold text-sm">{r.username}</p>
                    <p className="text-xs text-text-muted">{r.full_name}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Hash size={18} className="text-primary" /></div>
                  <div>
                    <p className="font-semibold text-sm">#{r.tag}</p>
                    <p className="text-xs text-text-muted">{r.post_count} posts</p>
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Trending hashtags */}
      {!query && hashtags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">Trending</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map(ht => (
              <Link key={ht.tag} to={`/explore?tag=${ht.tag}`}
                className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border-light rounded-full text-sm transition-colors">
                #{ht.tag}
                <span className="ml-1.5 text-xs text-text-faint">{ht.post_count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/posts/${post.id}`} className="relative aspect-square block group overflow-hidden rounded-sm">
                <img
                  src={post.thumbnail}
                  alt="post"
                  className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${post.sensitivity_label ? 'blur-md' : ''}`}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <span className="text-white text-xs font-bold">♥ {post.likes_count}</span>
                  <span className="text-white text-xs font-bold">💬 {post.comments_count}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
