import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { formatTimeAgo } from '../lib/utils';

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    conversations,
    messages,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    connect,
    isConnected,
  } = useChatStore();
  const [text, setText] = useState('');
  const [isFetchingConvs, setIsFetchingConvs] = useState(false);

  useEffect(() => {
    if (user) {
      connect(user.id);
      setIsFetchingConvs(true);
      fetchConversations().finally(() => setIsFetchingConvs(false));
    }
  }, [user?.id, connect, fetchConversations]);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      fetchMessages(conversationId);
    }
  }, [conversationId, setActiveConversation, fetchMessages]);

  const handleSend = () => {
    if (!text.trim() || !conversationId) return;
    sendMessage(conversationId, text.trim());
    setText('');
  };

  const activeConv = conversations.find((c) => c.id === conversationId);
  const activeMessages = conversationId ? messages[conversationId] || [] : [];

  return (
    <div className="flex h-dvh">
      {/* Conversations list */}
      <div
        className={`${
          conversationId ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 border-r border-border bg-surface`}
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg">Messages</h2>
        </div>

        {isFetchingConvs ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <MessageCircle size={40} className="mx-auto text-text-faint mb-3" />
            <p className="font-semibold">No conversations yet</p>
            <p className="text-sm text-text-muted mt-1">Start a chat from someone's profile</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {conversations.map((conv) => {
              const other = conv.other_user;
              const isActive = conv.id === conversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors text-left ${
                    isActive ? 'bg-surface-hover' : ''
                  }`}
                >
                  <Avatar src={other?.avatar_url} username={other?.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {other?.full_name || other?.username || 'Chat'}
                    </p>
                    {conv.last_message && (
                      <p className="text-xs text-text-muted truncate">
                        {typeof conv.last_message === 'string'
                          ? conv.last_message
                          : conv.last_message.content}
                      </p>
                    )}
                  </div>
                  {conv.last_message && (
                    <span className="text-xs text-text-faint flex-shrink-0">
                      {formatTimeAgo(
                        typeof conv.last_message === 'string'
                          ? (conv as any).last_message_at
                          : conv.last_message.created_at
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat area */}
      {conversationId ? (
        <div className="flex-1 flex flex-col bg-bg">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-surface">
            <button
              onClick={() => navigate('/messages')}
              className="md:hidden p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            {activeConv?.other_user && (
              <>
                <Avatar
                  src={activeConv.other_user.avatar_url}
                  username={activeConv.other_user.username}
                  size="sm"
                />
                <Link
                  to={`/profile/${activeConv.other_user.username}`}
                  className="font-semibold hover:underline"
                >
                  {activeConv.other_user.full_name || activeConv.other_user.username}
                </Link>
              </>
            )}
            <div
              className={`ml-auto w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-text-faint'
              }`}
              title={isConnected ? 'Connected' : 'Connecting...'}
            />
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {activeMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-gradient-brand text-white rounded-br-sm'
                          : 'bg-surface-hover text-text-primary rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                      <p
                        className={`text-[10px] mt-1 ${
                          isMe ? 'text-white/60' : 'text-text-faint'
                        }`}
                      >
                        {formatTimeAgo(msg.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Message input */}
          <div className="p-4 border-t border-border bg-surface flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="input-field flex-1"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="btn-primary p-3 rounded-xl !px-3.5"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-bg">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto text-text-faint mb-3" />
            <p className="font-semibold text-text-muted">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
