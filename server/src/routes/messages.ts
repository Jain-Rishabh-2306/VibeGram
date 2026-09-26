import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  const convos = await db.execute({ sql: `SELECT c.id,c.type,c.event_id,c.created_at,
    (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
    (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
    (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id) as message_count
    FROM conversations c JOIN conversation_participants cp ON cp.conversation_id=c.id AND cp.user_id=?
    WHERE c.type='direct' ORDER BY last_message_at DESC LIMIT 50`, args: [req.userId!] });
  const result = [];
  for (const convo of convos.rows) {
    const other = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,u.is_verified FROM conversation_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.conversation_id=? AND cp.user_id!=?`, args: [(convo as any).id, req.userId!] });
    result.push({ ...convo, other_user: other.rows[0] });
  }
  res.json({ success: true, conversations: result });
});

router.post('/conversations/direct', authenticate, async (req: AuthRequest, res) => {
  const { target_user_id } = req.body;
  if (!target_user_id) { res.status(400).json({ success: false, message: 'target_user_id required' }); return; }
  const existing = await db.execute({ sql: `SELECT cp1.conversation_id FROM conversation_participants cp1 JOIN conversation_participants cp2 ON cp2.conversation_id=cp1.conversation_id AND cp2.user_id=? JOIN conversations c ON c.id=cp1.conversation_id AND c.type='direct' WHERE cp1.user_id=?`, args: [target_user_id, req.userId!] });
  if (existing.rows[0]) { res.json({ success: true, conversation_id: (existing.rows[0] as any).conversation_id }); return; }
  const convoId = uuidv4();
  await db.execute({ sql: 'INSERT INTO conversations (id,type) VALUES (?,?)', args: [convoId, 'direct'] });
  await db.execute({ sql: 'INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)', args: [convoId, req.userId!] });
  await db.execute({ sql: 'INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)', args: [convoId, target_user_id] });
  res.status(201).json({ success: true, conversation_id: convoId });
});

router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!p.rows[0]) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }
  const page = parseInt(req.query.page as string) || 1; const limit = 30; const offset = (page - 1) * limit;
  const r = await db.execute({ sql: `SELECT m.*,u.username,u.full_name,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY m.created_at DESC LIMIT ? OFFSET ?`, args: [req.params.id, limit, offset] });
  res.json({ success: true, messages: r.rows.reverse(), hasMore: r.rows.length === limit });
});

router.get('/conversations/:id/search', authenticate, async (req: AuthRequest, res) => {
  const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!p.rows[0]) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }
  const { q, type, date_from, date_to } = req.query as Record<string, string>;
  const conditions: string[] = ['m.conversation_id=?']; const params: any[] = [req.params.id];
  if (q?.trim()) { conditions.push('m.content LIKE ?'); params.push(`%${q.trim()}%`); }
  if (type && ['text','image','link','location'].includes(type)) { conditions.push('m.message_type=?'); params.push(type); }
  if (date_from) { conditions.push('m.created_at >= ?'); params.push(parseInt(date_from)); }
  if (date_to) { conditions.push('m.created_at <= ?'); params.push(parseInt(date_to)); }
  const r = await db.execute({ sql: `SELECT m.*,u.username,u.full_name,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE ${conditions.join(' AND ')} ORDER BY m.created_at DESC LIMIT 50`, args: params });
  res.json({ success: true, messages: r.rows });
});

router.get('/conversations/:id/media-index', authenticate, async (req: AuthRequest, res) => {
  const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!p.rows[0]) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }
  const images = await db.execute({ sql: `SELECT m.id,m.content,m.created_at,u.username,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? AND m.message_type='image' ORDER BY m.created_at DESC`, args: [req.params.id] });
  const links = await db.execute({ sql: `SELECT m.id,m.content,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? AND m.message_type='link' ORDER BY m.created_at DESC`, args: [req.params.id] });
  const locations = await db.execute({ sql: `SELECT m.id,m.content,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? AND m.message_type='location' ORDER BY m.created_at DESC`, args: [req.params.id] });
  res.json({ success: true, media_index: { images: images.rows, links: links.rows, locations: locations.rows } });
});

router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res) => {
  const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!p.rows[0]) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }
  const { content, message_type = 'text', metadata } = req.body;
  if (!content?.trim()) { res.status(400).json({ success: false, message: 'Content required' }); return; }
  const msgId = uuidv4();
  await db.execute({ sql: 'INSERT INTO messages (id,conversation_id,sender_id,content,message_type,metadata) VALUES (?,?,?,?,?,?)', args: [msgId, req.params.id, req.userId!, content.trim(), message_type, metadata ? JSON.stringify(metadata) : null] });
  const msg = await db.execute({ sql: 'SELECT m.*,u.username,u.full_name,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?', args: [msgId] });
  res.status(201).json({ success: true, message: msg.rows[0] });
});

export default router;
