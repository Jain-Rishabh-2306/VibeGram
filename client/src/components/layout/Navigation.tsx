import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  PlusSquare,
  Heart,
  MessageCircle,
  User,
  Compass,
  Calendar,
  Image,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore } from '../../store/notifStore';
import { useThemeStore } from '../../store/themeStore';
import { useToast } from '../ui/Toast';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/create', icon: PlusSquare, label: 'Create' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Heart, label: 'Notifications' },
];

export function MobileNav() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const unread = useNotifStore((s) => s.unreadCount);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                active ? 'text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
              aria-label={label}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label === 'Notifications' && unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          );
        })}
        <Link
          to={`/profile/${user?.username}`}
          className={`flex flex-col items-center p-1 rounded-xl ${pathname.startsWith('/profile') ? 'ring-2 ring-primary' : ''}`}
          aria-label="Profile"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-6 h-6 avatar" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </nav>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useNotifStore((s) => s.unreadCount);
  const { theme, toggleTheme } = useThemeStore();
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

  const getThemeInfo = () => {
    switch (theme) {
      case 'light':
        return { icon: Sun, label: 'Clean Light' };
      case 'midnight':
        return { icon: Sparkles, label: 'Midnight OLED' };
      case 'dark':
      default:
        return { icon: Moon, label: 'Cyber Dark' };
    }
  };

  const currentThemeInfo = getThemeInfo();
  const ThemeIcon = currentThemeInfo.icon;

  const SIDEBAR_ITEMS = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/create', icon: PlusSquare, label: 'Create' },
    { to: '/messages', icon: MessageCircle, label: 'Messages', badge: unread },
    { to: '/notifications', icon: Heart, label: 'Notifications', badge: unread },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/albums', icon: Image, label: 'Albums' },
    { to: `/profile/${user?.username}`, icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border p-4 z-40">
      {/* Logo */}
      <div className="mb-8 px-2">
        <span className="font-display text-2xl font-bold gradient-text">VibeGram</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
        {SIDEBAR_ITEMS.map(({ to, icon: Icon, label, badge }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`font-medium text-sm ${active ? 'font-semibold' : ''}`}>{label}</span>
              {badge && badge > 0 && (
                <span className="ml-auto w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="flex flex-col gap-1 pt-3 pb-2 border-t border-border">
        <button
          onClick={toggleTheme}
          type="button"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all text-left"
          title="Click to cycle theme (Cyber Dark / Clean Light / Midnight OLED)"
        >
          <ThemeIcon size={20} className="text-secondary" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-text-faint uppercase font-bold tracking-wider block">Theme</span>
            <span className="text-sm font-medium">{currentThemeInfo.label}</span>
          </div>
        </button>

        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-accent/80 hover:bg-accent/10 hover:text-accent transition-all text-left"
          title="Log out of VibeGram"
        >
          <LogOut size={20} />
          <span className="text-sm font-semibold">Log Out</span>
        </button>
      </div>

      {/* User chip */}
      {user && (
        <Link
          to={`/profile/${user.username}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-all cursor-pointer mt-1"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-9 h-9 avatar" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.full_name}</p>
            <p className="text-xs text-text-muted truncate">@{user.username}</p>
          </div>
        </Link>
      )}
    </aside>
  );
}

