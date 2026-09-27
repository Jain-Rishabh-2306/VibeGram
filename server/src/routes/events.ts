import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(1).max(100),
  location_name: z.string().min(1).max(200),
  event_date: z.coerce.number(),
  description: z.string().max(500).optional().default(''),
  max_attendees: z.coerce.number().optional(),
});

// Create event/hangout
router.post('/', authenticate, (req: AuthRequest, res, next) => {
  try {
    const data = eventSchema.parse(req.body);
    const eventId = uuidv4();
    // Create a group chat for this event
    const convoId = uuidv4();
    db.prepare('INSERT INTO conversations (id,type,event_id) VALUES (?,?,?)').run(convoId, 'event_group', eventId);
    db.prepare('INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)').run(convoId, req.userId);
    // Send system message
    db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content,message_type) VALUES (?,?,?,?,?)').run(
      uuidv4(), convoId, req.userId!, `📅 ${data.title} group created! Share the event to invite friends.`, 'system'
    );

    db.prepare(`
      INSERT INTO events (id,creator_id,title,location_name,event_date,description,max_attendees,conversation_id)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(eventId, req.userId, data.title, data.location_name, data.event_date, data.description, data.max_attendees || null, convoId);

    // Creator auto-RSVPs as "going"
    db.prepare('INSERT INTO event_rsvps (event_id,user_id,status) VALUES (?,?,?)').run(eventId, req.userId, 'going');

    const event = getEventDetail(eventId, req.userId!);
    res.status(201).json({ success: true, event });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message });
    else next(err);
  }
});

function getEventDetail(eventId: string, currentUserId: string) {
  const event = db.prepare(`
    SELECT e.*, u.username as creator_username, u.full_name as creator_name, u.avatar_url as creator_avatar,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='going') as going_count,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='maybe') as maybe_count,
      (SELECT status FROM event_rsvps WHERE event_id=e.id AND user_id=?) as my_rsvp
    FROM events e JOIN users u ON u.id=e.creator_id WHERE e.id=?
  `).get(currentUserId, eventId) as any;
  if (event) {
    event.attendees = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, r.status
      FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=? LIMIT 20
    `).all(eventId);
  }
  return event;
}

// Get events feed (from followed users)
router.get('/feed', authenticate, (req: AuthRequest, res) => {
  const futureCutoff = Math.floor(Date.now() / 1000);
  const events = db.prepare(`
    SELECT e.*, u.username as creator_username, u.full_name as creator_name, u.avatar_url as creator_avatar,
      (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='going') as going_count,
      (SELECT status FROM event_rsvps WHERE event_id=e.id AND user_id=?) as my_rsvp
    FROM events e JOIN users u ON u.id=e.creator_id
    WHERE e.creator_id IN (SELECT following_id FROM follows WHERE follower_id=? AND status='accepted')
      OR e.creator_id=?
    AND e.event_date > ?
    ORDER BY e.event_date ASC LIMIT 20
  `).all(req.userId, req.userId, req.userId, futureCutoff);
  res.json({ success: true, events });
});

// Get single event
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  const event = getEventDetail(req.params.id, req.userId!);
  if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
  res.json({ success: true, event });
});

// RSVP to event
router.post('/:id/rsvp', authenticate, (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!['going', 'maybe', 'not_going'].includes(status)) {
    res.status(400).json({ success: false, message: 'status must be going, maybe, or not_going' }); return;
  }
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id) as any;
  if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }

  db.prepare('INSERT OR REPLACE INTO event_rsvps (event_id,user_id,status) VALUES (?,?,?)').run(req.params.id, req.userId, status);

  // Add user to event group chat if going
  if (status === 'going' && event.conversation_id) {
    db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id,user_id) VALUES (?,?)').run(event.conversation_id, req.userId);
    const user = db.prepare('SELECT full_name FROM users WHERE id=?').get(req.userId) as any;
    db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content,message_type) VALUES (?,?,?,?,?)').run(
      uuidv4(), event.conversation_id, req.userId!, `🙌 ${user?.full_name} is going!`, 'system'
    );
  }

  // Notify event creator
  if (event.creator_id !== req.userId) {
    db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
      uuidv4(), event.creator_id, req.userId, 'event_rsvp', req.params.id, 'event'
    );
  }

  res.json({ success: true, rsvp_status: status });
});

// Split-bill calculator
router.get('/:id/split-bill', authenticate, (req: AuthRequest, res) => {
  const { total_amount } = req.query;
  if (!total_amount) { res.status(400).json({ success: false, message: 'total_amount required' }); return; }
  const goingCount = db.prepare("SELECT COUNT(*) as count FROM event_rsvps WHERE event_id=? AND status='going'").get(req.params.id) as any;
  const count = goingCount?.count || 1;
  const total = parseFloat(total_amount as string);
  const perPerson = Math.ceil((total / count) * 100) / 100;
  
  const attendees = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url
    FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=? AND r.status='going'
  `).all(req.params.id);

  res.json({ success: true, split: { total, per_person: perPerson, attendee_count: count, attendees } });
});

// Delete event
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  const event = db.prepare('SELECT creator_id FROM events WHERE id=?').get(req.params.id) as any;
  if (!event || event.creator_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
