import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2, Lock, Globe, Briefcase, LogOut, Sun, Moon, Sparkles, Palette } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, Theme } from '../store/themeStore';
import { Avatar } from '../components/ui/Avatar';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required').max(60),
  bio: z.string().max(150, 'Bio max 150 chars').optional().default(''),
  website: z.string().url('Invalid URL').or(z.literal('')).optional().default(''),
  is_private: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const { add: toast, clear: clearToasts } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [profileMode, setProfileMode] = useState<'personal' | 'professional'>(user?.profile_mode || 'personal');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      toast('Logged out successfully', 'info');
      navigate('/login');
    } catch {
      toast('Failed to log out', 'error');
    }
  };

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      website: user?.website || '',
      is_private: !!user?.is_private,
    },
  });

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    if (isSubmittingRef.current || isSaving) return;
    isSubmittingRef.current = true;
    setIsSaving(true);
    clearToasts();

    try {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, String(v));
      });
      form.append('profile_mode', profileMode);
      if (avatarFile) form.append('avatar', avatarFile);

      const { data: res } = await api.put('/users/me/profile', form);

      updateUser(res.user);
      toast('Profile updated successfully!', 'success');
      navigate(`/profile/${res.user.username}`);
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
            <Avatar
              src={avatarPreview || user.avatar_url}
              username={user.username}
              size="xl"
              className="group-hover:opacity-70 transition-opacity"
            />
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Camera size={16} className="text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
        </div>

        {/* Profile mode toggle */}
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Profile Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'personal' as const, icon: Globe, label: 'Personal', desc: 'Share with friends' },
              { value: 'professional' as const, icon: Briefcase, label: 'Professional', desc: 'Network & work' },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setProfileMode(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${profileMode === value ? 'border-primary bg-primary/10' : 'border-border-light hover:border-primary/50'}`}
              >
                <Icon size={20} className={profileMode === value ? 'text-primary' : 'text-text-muted'} />
                <div className="text-center">
                  <p className={`text-sm font-semibold ${profileMode === value ? 'text-primary' : ''}`}>{label}</p>
                  <p className="text-xs text-text-faint">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Full Name</label>
            <input {...register('full_name')} className="input-field mt-1.5" />
            {errors.full_name && <p className="mt-1 text-xs text-accent">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Bio</label>
            <textarea {...register('bio')} rows={3} maxLength={150} placeholder="Write a short bio..." className="input-field mt-1.5 resize-none" />
            {errors.bio && <p className="mt-1 text-xs text-accent">{errors.bio.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Website</label>
            <input {...register('website')} type="url" placeholder="https://yoursite.com" className="input-field mt-1.5" />
            {errors.website && <p className="mt-1 text-xs text-accent">{errors.website.message}</p>}
          </div>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-text-muted" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-text-muted">Only approved followers see your posts</p>
              </div>
            </div>
            <input
              {...register('is_private')}
              type="checkbox"
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Theme & Appearance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Theme & Appearance</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark' as Theme, label: 'Cyber Dark', icon: Moon, desc: 'Neon Dark' },
              { id: 'light' as Theme, label: 'Clean Light', icon: Sun, desc: 'Crisp White' },
              { id: 'midnight' as Theme, label: 'Midnight', icon: Sparkles, desc: 'OLED Pure Black' },
            ].map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  theme === id
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border hover:bg-surface-hover text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon size={20} className="mb-1.5" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] text-text-faint">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button type="submit" disabled={isSaving} className="btn-primary w-full flex items-center justify-center gap-2">
          {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Changes'}
        </button>

        {/* Account Actions / Logout */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-accent/30 text-accent hover:bg-accent/10 transition-colors font-semibold text-sm"
          >
            <LogOut size={16} /> Log Out of VibeGram
          </button>
        </div>
      </form>
    </div>
  );
}

