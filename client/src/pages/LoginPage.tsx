import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';

const schema = z.object({
  credential: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { add: toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.credential, data.password);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Login failed. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl font-bold gradient-text mb-2">VibeGram</h1>
          <p className="text-text-muted text-sm">Share your moments</p>
        </div>

        {/* Form */}
        <div className="card p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center">Welcome back</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                {...register('credential')}
                placeholder="Username or email"
                className="input-field"
                autoComplete="username"
              />
              {errors.credential && <p className="mt-1 text-xs text-accent">{errors.credential.message}</p>}
            </div>

            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                className="input-field pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <p className="mt-1 text-xs text-accent">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
