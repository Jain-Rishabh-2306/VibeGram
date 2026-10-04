import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; }
interface ToastStore { toasts: Toast[]; add: (message: string, type?: Toast['type']) => void; remove: (id: string) => void; }

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const ICONS = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info };
const COLORS = { success: 'text-green-400 bg-green-400/10 border-green-400/20', error: 'text-accent bg-accent/10 border-accent/20', warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', info: 'text-secondary bg-secondary/10 border-secondary/20' };

export function ToastContainer() {
  const { toasts, remove } = useToast();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-card pointer-events-auto max-w-sm ${COLORS[toast.type]}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <p className="text-sm font-medium text-text-primary">{toast.message}</p>
              <button onClick={() => remove(toast.id)} className="ml-auto hover:opacity-70 transition-opacity"><X size={14} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
