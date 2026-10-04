interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }
const SIZES = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' };
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`${SIZES[size]} border-2 border-primary/20 border-t-primary rounded-full animate-spin ${className}`} />
  );
}
