import { useState, useEffect, useRef } from 'react';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui/Toast';
import api from '../../lib/api';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption: string;
  expires_at: number;
  created_at?: number;
  is_viewed?: number;
}

interface StoryUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  story_count?: number;
  latest_story?: number;
}

export function StoriesBar() {
  const user = useAuthStore((s) => s.user);
  const { add: toast } = useToast();

  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [activeStoryList, setActiveStoryList] = useState<Story[]>([]);
  const [activeUser, setActiveUser] = useState<{ id: string; username: string; avatar_url?: string } | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  // Upload modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStories = async () => {
    try {
      const { data } = await api.get('/stories/feed');
      setStoryUsers(data.storyUsers || []);
      setMyStories(data.myStories || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Trigger file selection for adding a story
  const handleOpenPicker = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadStory = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('media', selectedFile);
      if (caption.trim()) form.append('caption', caption.trim());

      await api.post('/stories', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast('Story shared! 📸', 'success');
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      fetchStories();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to share story', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenMyStory = () => {
    if (myStories.length > 0) {
      setActiveUser({
        id: user?.id || '',
        username: user?.username || 'You',
        avatar_url: user?.avatar_url,
      });
      setActiveStoryList(myStories);
      setActiveStoryIndex(0);
      setIsViewerOpen(true);
    } else {
      handleOpenPicker();
    }
  };

  const handleOpenUserStory = async (storyUser: StoryUser) => {
    try {
      const { data } = await api.get(`/stories/user/${storyUser.id}`);
      if (data.stories && data.stories.length > 0) {
        setActiveUser({
          id: storyUser.id,
          username: storyUser.username,
          avatar_url: storyUser.avatar_url,
        });
        setActiveStoryList(data.stories);
        setActiveStoryIndex(0);
        setIsViewerOpen(true);

        // Mark first story as viewed
        api.post(`/stories/${data.stories[0].id}/view`).catch(() => {});
      }
    } catch {
      toast('Could not load stories', 'error');
    }
  };

  // Story Viewer Timer & Controls
  useEffect(() => {
    if (!isViewerOpen || activeStoryList.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (activeStoryIndex < activeStoryList.length - 1) {
        setActiveStoryIndex((prev) => prev + 1);
      } else {
        setIsViewerOpen(false);
      }
    }, 5000);

    // Mark current story as viewed
    const cur = activeStoryList[activeStoryIndex];
    if (cur) {
      api.post(`/stories/${cur.id}/view`).catch(() => {});
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isViewerOpen, activeStoryIndex, activeStoryList]);

  const handleNextStory = () => {
    if (activeStoryIndex < activeStoryList.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      setIsViewerOpen(false);
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await api.delete(`/stories/${storyId}`);
      toast('Story deleted', 'info');
      const updated = activeStoryList.filter((s) => s.id !== storyId);
      if (updated.length > 0) {
        setActiveStoryList(updated);
        setActiveStoryIndex(Math.min(activeStoryIndex, updated.length - 1));
      } else {
        setIsViewerOpen(false);
      }
      fetchStories();
    } catch {
      toast('Failed to delete story', 'error');
    }
  };

  return (
    <>
      <div className="card p-4">
        {/* Hidden file input for adding stories */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {/* Your Story */}
          <div
            onClick={handleOpenMyStory}
            className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
          >
            <div className="relative">
              <Avatar
                src={user?.avatar_url}
                username={user?.username}
                size="lg"
                hasStory={myStories.length > 0}
              />
              <button
                type="button"
                onClick={handleOpenPicker}
                title="Add new story"
                className="absolute bottom-0 right-0 w-5 h-5 bg-primary hover:bg-primary-hover rounded-full flex items-center justify-center border-2 border-bg transition-transform hover:scale-110 shadow"
              >
                <Plus size={12} className="text-white" />
              </button>
            </div>
            <span className="text-xs text-text-muted">Your story</span>
          </div>

          {/* Following Users' Stories */}
          {storyUsers.map((su) => (
            <div
              key={su.id}
              onClick={() => handleOpenUserStory(su)}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
            >
              <Avatar
                src={su.avatar_url}
                username={su.username}
                size="lg"
                hasStory={true}
              />
              <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors truncate w-14 text-center">
                {su.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Story Upload Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-sm w-full p-4 flex flex-col gap-3 relative"
            >
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-surface-light text-text-muted hover:text-text-primary z-10"
              >
                <X size={16} />
              </button>

              <h3 className="font-semibold text-sm">Add to Story</h3>

              <div className="relative aspect-[9/16] max-h-[380px] w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <input
                type="text"
                placeholder="Add a caption... (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={100}
                className="input-field text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadStory}
                  disabled={isUploading}
                  className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sharing...
                    </>
                  ) : (
                    'Share Story 🚀'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {isViewerOpen && activeStoryList.length > 0 && activeUser && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm aspect-[9/16] max-h-[90vh] bg-surface-dark rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border"
            >
              {/* Progress Bars */}
              <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
                {activeStoryList.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full bg-white transition-all duration-[5000ms] linear ${
                        idx < activeStoryIndex
                          ? 'w-full'
                          : idx === activeStoryIndex
                          ? 'w-full'
                          : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-5 left-3 right-3 z-20 flex items-center justify-between text-white drop-shadow">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={activeUser.avatar_url}
                    username={activeUser.username}
                    size="sm"
                  />
                  <span className="font-semibold text-sm">
                    {activeUser.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Delete button if it's current user's story */}
                  {activeUser.id === user?.id && (
                    <button
                      onClick={() =>
                        handleDeleteStory(
                          activeStoryList[activeStoryIndex]?.id
                        )
                      }
                      title="Delete story"
                      className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-accent"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsViewerOpen(false)}
                    className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Story Image */}
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={activeStoryList[activeStoryIndex]?.media_url}
                  alt="story"
                  className="w-full h-full object-cover"
                />

                {/* Left/Right Click Areas */}
                <div
                  onClick={handlePrevStory}
                  className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10"
                />
                <div
                  onClick={handleNextStory}
                  className="absolute inset-y-0 right-0 w-2/3 cursor-pointer z-10"
                />

                {/* Nav buttons for desktop */}
                {activeStoryIndex > 0 && (
                  <button
                    onClick={handlePrevStory}
                    className="absolute left-2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {activeStoryIndex < activeStoryList.length - 1 && (
                  <button
                    onClick={handleNextStory}
                    className="absolute right-2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>

              {/* Caption */}
              {activeStoryList[activeStoryIndex]?.caption && (
                <div className="absolute bottom-4 inset-x-4 z-20 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-center">
                  <p className="text-sm text-white font-medium">
                    {activeStoryList[activeStoryIndex]?.caption}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
