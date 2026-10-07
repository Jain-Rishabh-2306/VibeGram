import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, Heart } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { formatTimeAgo } from '../../lib/utils';
import { Post } from '../../store/feedStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  content: string;
  created_at: number;
  reply_count: number;
}

interface CommentsModalProps {
  post: Post | null;
  onClose: () => void;
}

export function CommentsModal({ post, onClose }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const user = useAuthStore(s => s.user);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!post) return;
    setIsLoading(true);
    api.get(`/posts/${post.id}/comments`).then(({ data }) => {
      setComments(data.comments);
    }).finally(() => setIsLoading(false));
  }, [post?.id]);

  const send = async () => {
    if (!text.trim() || !post) return;
    setIsSending(true);
    try {
      const { data } = await api.post(`/posts/${post.id}/comments`, { content: text.trim() });
      setComments(prev => [data.comment, ...prev]);
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal open={!!post} onClose={onClose} title="Comments" size="md">
      <div className="flex flex-col h-[60vh]">
        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p className="text-2xl mb-2">💬</p>
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Avatar src={comment.avatar_url} username={comment.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="bg-surface-hover rounded-xl px-3 py-2">
                    <Link to={`/profile/${comment.username}`} className="text-sm font-semibold hover:underline">{comment.username}</Link>
                    <p className="text-sm text-text-primary mt-0.5">{comment.content}</p>
                  </div>
                  <p className="text-xs text-text-faint mt-1 px-1">{formatTimeAgo(comment.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 flex gap-3 items-center">
          <Avatar src={user?.avatar_url} username={user?.username} size="sm" />
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Add a comment..."
            className="input-field flex-1 py-2 text-sm"
          />
          <button onClick={send} disabled={!text.trim() || isSending} className="btn-primary p-2.5 rounded-xl !px-3">
            {isSending ? <Spinner size="sm" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
