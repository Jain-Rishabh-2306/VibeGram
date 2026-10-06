import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, User, Mail, Lock, AtSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';

const schema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(60),
  username: z.string().min(3, 'Min 3 characters').max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Only letters, numbers, . and _'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const { register: registerUser, isLoading } = useAuthStore();
  const { add: toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Registration failed. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-bold gradient-text mb-2">VibeGram</h1>
          <p className="text-text-muted text-sm">Share your world</p>
        </div>

        <div className="card p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center">Create account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'full_name' as const, placeholder: 'Full name', icon: User, type: 'text', autoComplete: 'name' },
              { name: 'username' as const, placeholder: 'Username', icon: AtSign, type: 'text', autoComplete: 'username' },
              { name: 'email' as const, placeholder: 'Email', icon: Mail, type: 'email', autoComplete: 'email' },
            ].map(({ name, placeholder, icon: Icon, type, autoComplete }) => (
              <div key={name}>
                <div className="relative">
                  <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input {...register(name)} type={type} placeholder={placeholder} autoComplete={autoComplete} className="input-field pl-10" />
                </div>
                {errors[name] && <p className="mt-1 text-xs text-accent">{errors[name]?.message}</p>}
              </div>
            ))}

            <div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password (min 8 chars)"
                  autoComplete="new-password"
                  className="input-field pl-10 pr-12"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-accent">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
