import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';

// Pages (lazy loaded)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const AlbumsPage = lazy(() => import('./pages/AlbumsPage'));

function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="font-display text-3xl font-bold gradient-text mb-6">VibeGram</div>
        <Spinner size="lg" />
      </div>
    </div>
  );
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      [
        'vibegram_mock_users',
        'vibegram_mock_posts',
        'vibegram_mock_current_user',
        'vibegram_mock_events',
        'vibegram_mock_albums',
        'vibegram_mock_notifs',
        'vibegram_mock_stories',
      ].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('vibegram_token') : null;
    if (token && !isAuthenticated) {
      fetchMe();
    }
  }, []); // Run once on initial mount only

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Guest routes */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<FeedPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/create" element={<CreatePostPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:conversationId" element={<MessagesPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/posts/:postId" element={<PostDetailPage />} />
              <Route path="/settings/profile" element={<EditProfilePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/albums" element={<AlbumsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
