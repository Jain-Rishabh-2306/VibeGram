import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  media_url: string;
  expires_at: number;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  stories: Story[];
}

export function StoriesBar() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    api.get('/stories/feed').then(({ data }) => {
      setGroups(data.stories || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="card p-4">
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0">
          <div className="relative">
            <Avatar src={user?.avatar_url} username={user?.username} size="lg" />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-bg">
              <Plus size={12} className="text-white" />
            </div>
          </div>
          <span className="text-xs text-text-muted">Your story</span>
        </div>

        {/* Others' stories */}
        {groups.map(group => (
          <div key={group.user_id} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
            <Avatar src={group.avatar_url} username={group.username} size="lg" hasStory />
            <span className="text-xs text-text-muted truncate w-14 text-center">{group.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
