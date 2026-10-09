import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifStore, Notification } from '../store/notifStore';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { formatTimeAgo } from '../lib/utils';

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  like: <Heart size={14} fill="#F43F5E" className="text-accent" />,
  comment: <MessageCircle size={14} className="text-secondary" />,
  follow: <UserPlus size={14} className="text-primary" />,
  mention: <Bell size={14} className="text-yellow-400" />,
  poll_vote: <span className="text-sm">🗳️</span>,
  event_rsvp: <span className="text-sm">📅</span>,
  album_invite: <span className="text-sm">🖼️</span>,
  capsule_published: <span className="text-sm">⏰</span>,
};

const TYPE_TEXT: Record<Notification['type'], string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  mention: 'mentioned you',
  poll_vote: 'voted on your poll',
  event_rsvp: "RSVP'd to your event",
  album_invite: 'invited you to an album',
  capsule_published: 'Your time capsule was published',
};

export default function NotificationsPage() {
  const { notifications, isLoading, fetch, markAllRead } = useNotifStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="text-sm text-primary hover:underline font-medium">
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="mx-auto text-text-faint mb-3" />
          <p className="font-semibold">No notifications yet</p>
          <p className="text-sm text-text-muted mt-1">
            When someone likes or comments on your post, you'll see it here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                !notif.is_read ? 'bg-primary/5' : 'hover:bg-surface-hover'
              }`}
            >
              <div className="relative">
                <Avatar src={notif.actor?.avatar_url} username={notif.actor?.username} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-surface rounded-full flex items-center justify-center border border-border">
                  {TYPE_ICONS[notif.type]}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {notif.actor && (
                    <Link
                      to={`/profile/${notif.actor.username}`}
                      className="font-semibold hover:underline mr-1"
                    >
                      {notif.actor.username}
                    </Link>
                  )}
                  <span className="text-text-muted">{TYPE_TEXT[notif.type]}</span>
                </p>
                <p className="text-xs text-text-faint">{formatTimeAgo(notif.created_at)}</p>
              </div>
              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
