import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import api from '../lib/api';

interface EventItem {
  id: string;
  creator_id: string;
  title: string;
  location_name: string;
  event_date: number;
  description: string;
  max_attendees: number | null;
  creator_username: string;
  creator_name: string;
  creator_avatar: string;
  going_count: number;
  my_rsvp: 'going' | 'maybe' | 'not_going' | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add: toast } = useToast();

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events/feed');
      setEvents(data.events || []);
    } catch {
      toast('Failed to load events', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !locationName || !eventDate) {
      toast('Please fill all required fields', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/events', {
        title,
        location_name: locationName,
        event_date: Math.floor(new Date(eventDate).getTime() / 1000),
        description,
      });
      toast('Event created!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setLocationName('');
      setEventDate('');
      setDescription('');
      fetchEvents();
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to create event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRsvp = async (eventId: string, status: 'going' | 'maybe') => {
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                my_rsvp: status,
                going_count:
                  status === 'going' && ev.my_rsvp !== 'going'
                    ? ev.going_count + 1
                    : ev.my_rsvp === 'going' && status !== 'going'
                    ? ev.going_count - 1
                    : ev.going_count,
              }
            : ev
        )
      );
      toast(`RSVP updated: ${status}`, 'success');
    } catch {
      toast('Could not update RSVP', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> Events & Hangouts
          </h1>
          <p className="text-xs text-text-muted mt-1">Plan meetups and hang out with friends</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
        >
          <Plus size={16} /> Plan Event
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 card p-8">
          <Calendar size={48} className="mx-auto text-text-faint mb-3" />
          <h3 className="text-lg font-semibold mb-1">No upcoming events</h3>
          <p className="text-sm text-text-muted mb-4">
            Create an event and invite your friends or followers!
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm py-2 px-4">
            Plan your first event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev, i) => {
            const dateStr = new Date(ev.event_date * 1000).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ev.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <Avatar
                        src={ev.creator_avatar}
                        username={ev.creator_username}
                        size="xs"
                      />
                      <span>Hosted by @{ev.creator_username}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 font-semibold px-2.5 py-1 rounded-full">
                    {dateStr}
                  </span>
                </div>

                {ev.description && (
                  <p className="text-sm text-text-primary mb-3">{ev.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-secondary" />
                    <span>{ev.location_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-accent" />
                    <span>{ev.going_count} Going</span>
                  </div>

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => handleRsvp(ev.id, 'going')}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                        ev.my_rsvp === 'going'
                          ? 'bg-primary text-white border-primary'
                          : 'border-border-light hover:border-primary'
                      }`}
                    >
                      {ev.my_rsvp === 'going' && <Check size={12} />} Going
                    </button>
                    <button
                      onClick={() => handleRsvp(ev.id, 'maybe')}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        ev.my_rsvp === 'maybe'
                          ? 'bg-surface-hover text-text-primary border-primary'
                          : 'border-border-light hover:border-surface-hover'
                      }`}
                    >
                      Maybe
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Plan an Event">
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted">Event Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Coffee & Jam"
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted">Location</label>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Blue Tokai Cafe, Indiranagar"
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted">Date & Time</label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the plan?"
              rows={3}
              className="input-field mt-1 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-2.5 mt-2 flex justify-center items-center gap-2"
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Create Event'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
