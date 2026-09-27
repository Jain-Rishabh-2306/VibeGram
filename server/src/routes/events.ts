import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({ title: z.string().min(1).max(100), location_name: z.string().min(1).max(200), event_date: z.coerce.number(), description: z.string().max(500).optional().default(''), max_attendees: z.coerce.number().optional() }).parse(req.body);
    const eventId = uuidv4(); const convoId = uuidv4();
    await db.execute({ sql: 'INSERT INTO conversations (id,type,event_id) VALUES (?,?,?)', args: [convoId, 'event_group', eventId] });
    await db.execute({ sql: 'INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)', args: [convoId, req.userId!] });
    await db.execute({ sql: 'INSERT INTO messages (id,conversation_id,sender_id,content,message_type) VALUES (?,?,?,?,?)', args: [uuidv4(), convoId, req.userId!, `📅 ${data.title} group created!`, 'system'] });
    await db.execute({ sql: 'INSERT INTO events (id,creator_id,title,location_name,event_date,description,max_attendees,conversation_id) VALUES (?,?,?,?,?,?,?,?)', args: [eventId, req.userId!, data.title, data.location_name, data.event_date, data.description, data.max_attendees ?? null, convoId] });
    await db.execute({ sql: 'INSERT INTO event_rsvps (event_id,user_id,status) VALUES (?,?,?)', args: [eventId, req.userId!, 'going'] });
    const event = await getEventDetail(eventId, req.userId!);
    res.status(201).json({ success: true, event });
  } catch (err) { if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message }); else next(err); }
});

async function getEventDetail(eventId: string, currentUserId: string) {
  const r = await db.execute({ sql: `SELECT e.*,u.username as creator_username,u.full_name as creator_name,u.avatar_url as creator_avatar,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='going') as going_count,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='maybe') as maybe_count,
    (SELECT status FROM event_rsvps WHERE event_id=e.id AND user_id=?) as my_rsvp
    FROM events e JOIN users u ON u.id=e.creator_id WHERE e.id=?`, args: [currentUserId, eventId] });
  const event = r.rows[0] as any;
  if (event) {
    const att = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,r.status FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=? LIMIT 20`, args: [eventId] });
    event.attendees = att.rows;
  }
  return event;
}

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  const cutoff = Math.floor(Date.now() / 1000);
  const r = await db.execute({ sql: `SELECT e.*,u.username as creator_username,u.full_name as creator_name,u.avatar_url as creator_avatar,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='going') as going_count,
    (SELECT status FROM event_rsvps WHERE event_id=e.id AND user_id=?) as my_rsvp
    FROM events e JOIN users u ON u.id=e.creator_id
    WHERE (e.creator_id IN (SELECT following_id FROM follows WHERE follower_id=? AND status='accepted') OR e.creator_id=?)
    AND e.event_date > ? ORDER BY e.event_date ASC LIMIT 20`, args: [req.userId!, req.userId!, req.userId!, cutoff] });
  res.json({ success: true, events: r.rows });
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const event = await getEventDetail(req.params.id, req.userId!);
  if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
  res.json({ success: true, event });
});

router.post('/:id/rsvp', authenticate, async (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!['going','maybe','not_going'].includes(status)) { res.status(400).json({ success: false, message: 'Invalid status' }); return; }
  const event = await db.execute({ sql: 'SELECT * FROM events WHERE id=?', args: [req.params.id] });
  const ev = event.rows[0] as any;
  if (!ev) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
  await db.execute({ sql: 'INSERT OR REPLACE INTO event_rsvps (event_id,user_id,status) VALUES (?,?,?)', args: [req.params.id, req.userId!, status] });
  if (status === 'going' && ev.conversation_id) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO conversation_participants (conversation_id,user_id) VALUES (?,?)', args: [ev.conversation_id, req.userId!] });
    const user = await db.execute({ sql: 'SELECT full_name FROM users WHERE id=?', args: [req.userId!] });
    await db.execute({ sql: 'INSERT INTO messages (id,conversation_id,sender_id,content,message_type) VALUES (?,?,?,?,?)', args: [uuidv4(), ev.conversation_id, req.userId!, `🙌 ${(user.rows[0] as any)?.full_name} is going!`, 'system'] });
  }
  if (ev.creator_id !== req.userId) { await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), ev.creator_id, req.userId!, 'event_rsvp', req.params.id, 'event'] }); }
  res.json({ success: true, rsvp_status: status });
});

router.get('/:id/split-bill', authenticate, async (req: AuthRequest, res) => {
  const { total_amount } = req.query;
  if (!total_amount) { res.status(400).json({ success: false, message: 'total_amount required' }); return; }
  const r = await db.execute({ sql: "SELECT COUNT(*) as count FROM event_rsvps WHERE event_id=? AND status='going'", args: [req.params.id] });
  const count = ((r.rows[0] as any).count as number) || 1;
  const total = parseFloat(total_amount as string);
  const perPerson = Math.ceil((total / count) * 100) / 100;
  const att = await db.execute({ sql: "SELECT u.id,u.username,u.full_name,u.avatar_url FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=? AND r.status='going'", args: [req.params.id] });
  res.json({ success: true, split: { total, per_person: perPerson, attendee_count: count, attendees: att.rows } });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: 'SELECT creator_id FROM events WHERE id=?', args: [req.params.id] });
  if (!r.rows[0] || r.rows[0].creator_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  await db.execute({ sql: 'DELETE FROM events WHERE id=?', args: [req.params.id] });
  res.json({ success: true });
});

export default router;
