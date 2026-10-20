import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, X, Plus, Hash, MapPin, Eye, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '../store/feedStore';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';

type Visibility = 'personal' | 'professional' | 'both';
type SensitivityLabel = 'spoiler' | 'sensitive' | 'satire' | '';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { add: toast } = useToast();
  const { addPost } = useFeedStore();

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('both');
  const [sensitivityLabel, setSensitivityLabel] = useState<SensitivityLabel>('');
  const [hashtags, setHashtags] = useState('');
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles = Array.from(selected).slice(0, 10 - files.length);
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (files.length === 0) {
      toast('Please add at least one image', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('media', f));
      form.append('caption', caption);
      form.append('location', location);
      form.append('visibility', visibility);
      if (sensitivityLabel) form.append('sensitivity_label', sensitivityLabel);
      if (hashtags) {
        form.append(
          'hashtags',
          hashtags
            .split(' ')
            .map((t) => t.replace(/^#/, ''))
            .filter(Boolean)
            .join(',')
        );
      }
      if (isTimeCapsule && publishAt) {
        form.append('is_time_capsule', 'true');
        form.append('publish_at', String(Math.floor(new Date(publishAt).getTime() / 1000)));
      }
      if (hasPoll && pollQuestion.trim()) {
        form.append('poll_question', pollQuestion);
        form.append('poll_options', JSON.stringify(pollOptions.filter((o) => o.trim().length > 0)));
      }

      const { data } = await api.post('/posts', form);
      if (data.post && data.post.is_published) {
        addPost(data.post);
      }
      toast('Post shared! 🎉', 'success');
      navigate('/');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to create post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">New Post</h1>
        <button
          onClick={submit}
          disabled={isSubmitting || files.length === 0}
          className="btn-primary flex items-center gap-2 py-2 px-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Sharing...
            </>
          ) : (
            'Share'
          )}
        </button>
      </div>

      {/* Media upload area */}
      <div className="card p-4 mb-4">
        {previews.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border-light rounded-xl py-16 flex flex-col items-center gap-3 hover:border-primary transition-colors group"
          >
            <Image
              size={40}
              className="text-text-faint group-hover:text-primary transition-colors"
            />
            <div className="text-center">
              <p className="font-medium">Add photos or videos</p>
              <p className="text-sm text-text-muted mt-1">Up to 10 files</p>
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square">
                <img
                  src={p}
                  alt={`preview-${i}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            {previews.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border-light hover:border-primary transition-colors flex items-center justify-center"
              >
                <Plus size={24} className="text-text-faint" />
              </button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Caption & Hashtags */}
      <div className="card p-4 mb-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={3}
          maxLength={2200}
          className="w-full bg-transparent resize-none focus:outline-none text-sm placeholder:text-text-faint"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-text-faint">
            <Hash size={15} />
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="hashtags (space separated)"
              className="bg-transparent text-sm focus:outline-none w-48"
            />
          </div>
          <span className="text-xs text-text-faint">{caption.length}/2200</span>
        </div>
      </div>

      {/* Metadata fields */}
      <div className="card p-4 mb-4 space-y-4">
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-text-faint flex-shrink-0" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-text-faint"
          />
        </div>

        <div className="flex items-center gap-3">
          <Eye size={16} className="text-text-faint flex-shrink-0" />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="flex-1 bg-surface border border-border-light rounded-lg px-2 py-1 text-sm focus:outline-none text-text-primary"
          >
            <option value="both">Visible to Everyone</option>
            <option value="personal">Personal contacts only</option>
            <option value="professional">Professional contacts only</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-text-faint w-4">⚠️</span>
          <select
            value={sensitivityLabel}
            onChange={(e) => setSensitivityLabel(e.target.value as SensitivityLabel)}
            className="flex-1 bg-surface border border-border-light rounded-lg px-2 py-1 text-sm focus:outline-none text-text-primary"
          >
            <option value="">No sensitivity label</option>
            <option value="spoiler">Spoiler Alert</option>
            <option value="sensitive">Sensitive Content</option>
            <option value="satire">Satire</option>
          </select>
        </div>
      </div>

      {/* Time Capsule */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-primary" />
            <div>
              <p className="text-sm font-medium">Time Capsule</p>
              <p className="text-xs text-text-muted">Schedule this post for future unlock</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTimeCapsule((s) => !s)}
            className={`w-10 h-5 rounded-full transition-colors ${
              isTimeCapsule ? 'bg-primary' : 'bg-surface-light'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                isTimeCapsule ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <AnimatePresence>
          {isTimeCapsule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="input-field"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Poll */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base">🗳️</span>
            <div>
              <p className="text-sm font-medium">Add Poll</p>
              <p className="text-xs text-text-muted">Ask your followers a question</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHasPoll((s) => !s)}
            className={`w-10 h-5 rounded-full transition-colors ${
              hasPoll ? 'bg-primary' : 'bg-surface-light'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                hasPoll ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <AnimatePresence>
          {hasPoll && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="input-field"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((o, idx) => (idx === i ? e.target.value : o))
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="input-field flex-1"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="p-2 text-text-muted hover:text-accent"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add option
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

