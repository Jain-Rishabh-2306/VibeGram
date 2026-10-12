import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Users, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';

interface AlbumItem {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  creator_id: string;
  role: 'owner' | 'contributor';
  media_count: number;
  member_count: number;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add: toast } = useToast();

  const fetchAlbums = async () => {
    try {
      const { data } = await api.get('/albums/mine');
      setAlbums(data.albums || []);
    } catch {
      toast('Failed to load albums', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Title is required', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/albums', { title: title.trim(), description: description.trim() });
      toast('Album created!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      fetchAlbums();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to create album', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="text-primary" /> Collaborative Albums
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Share and collect photos with friends in shared spaces
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
        >
          <Plus size={16} /> New Album
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 card p-8">
          <FolderPlus size={48} className="mx-auto text-text-faint mb-3" />
          <h3 className="text-lg font-semibold mb-1">No albums yet</h3>
          <p className="text-sm text-text-muted mb-4">
            Create a collaborative album to drop trip photos, party pics, or memories!
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm py-2 px-4">
            Create an album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {albums.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="aspect-video rounded-xl bg-surface-light overflow-hidden mb-3 relative flex items-center justify-center">
                {album.cover_url ? (
                  <img
                    src={album.cover_url}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <ImageIcon size={36} className="text-text-faint" />
                )}
                <span className="absolute top-2 right-2 text-[10px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold text-white">
                  {album.role}
                </span>
              </div>
              <h3 className="font-semibold text-base truncate">{album.title}</h3>
              {album.description && (
                <p className="text-xs text-text-muted truncate mt-0.5">{album.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-text-faint mt-3 pt-2 border-t border-border">
                <span className="flex items-center gap-1">
                  <ImageIcon size={12} /> {album.media_count} items
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {album.member_count} members
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Album">
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted">Album Name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Goa Trip 2026, Birthday Bash"
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this album about?"
              rows={3}
              className="input-field mt-1 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-2.5 mt-2 flex justify-center items-center gap-2"
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Create Album'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
