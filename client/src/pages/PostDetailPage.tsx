import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { PostCard } from '../components/post/PostCard';
import { CommentsModal } from '../components/post/CommentsModal';
import { SkeletonPost } from '../components/ui/SkeletonCard';
import type { Post } from '../store/feedStore';
import api from '../lib/api';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    api.get(`/posts/${postId}`)
      .then(({ data }) => setPost(data.post))
      .finally(() => setIsLoading(false));
  }, [postId]);

  return (
    <div className="max-w-xl mx-auto px-3 py-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold">Post</h1>
      </div>

      {isLoading ? (
        <SkeletonPost />
      ) : post ? (
        <>
          <PostCard post={post} onComment={() => setShowComments(true)} />
          <CommentsModal post={showComments ? post : null} onClose={() => setShowComments(false)} />
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">Post not found</p>
        </div>
      )}
    </div>
  );
}

