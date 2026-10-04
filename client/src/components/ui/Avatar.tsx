import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZES = { xs: 'w-7 h-7 text-xs', sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' };

export function Avatar({ src, username, size = 'md', hasStory, className = '', onClick }: AvatarProps) {
  const sizeClass = SIZES[size];
  const inner = src ? (
    <img src={src} alt={username} className={`${sizeClass} rounded-full object-cover bg-surface-light flex-shrink-0 ${className}`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}>
      {username ? username[0].toUpperCase() : <User size={16} />}
    </div>
  );

  if (hasStory) {
    return (
      <div className={`story-ring ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        <div className="p-0.5 rounded-full bg-bg">{inner}</div>
      </div>
    );
  }
  return <div className={onClick ? 'cursor-pointer' : ''} onClick={onClick}>{inner}</div>;
}
