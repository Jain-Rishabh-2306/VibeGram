import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get conversations list
router.get('/conversations', authenticate, (req: AuthRequest, res) => {
  const convos = db.prepare(`
    SELECT c.id, c.type, c.event_id, c.created_at,
      (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id) as message_count
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id=c.id AND cp.user_id=?
    WHERE c.type='direct'
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 50
  `).all(req.userId) as any[];

  // Attach the other participant for direct messages
  for (const convo of convos) {
    const other = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified
      FROM conversation_participants cp JOIN users u ON u.id=cp.user_id
      WHERE cp.conversation_id=? AND cp.user_id!=?
    `).get(convo.id, req.userId);
    convo.other_user = other;
  }

  res.json({ success: true, conversations: convos });
});

// Get or create direct conversation with user
router.post('/conversations/direct', authenticate, (req: AuthRequest, res) => {
  const { target_user_id } = req.body;
  if (!target_user_id) { res.status(400).json({ success: false, message: 'target_user_id required' }); return; }

  // Check if conversation already exists
  const existing = db.prepare(`
    SELECT cp1.conversation_id FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp2.conversation_id=cp1.conversation_id AND cp2.user_id=?
    JOIN conversations c ON c.id=cp1.conversation_id AND c.type='direct'
    WHERE cp1.user_id=?
  `).get(target_user_id, req.userId) as any;

  if (existing) {
    res.json({ success: true, conversation_id: existing.conversation_id });
    return;
  }

  const convoId = uuidv4();
  db.prepare('INSERT INTO conversations (id,type) VALUES (?,?)').run(convoId, 'direct');
  db.prepare('INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)').run(convoId, req.userId);
  db.prepare('INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)').run(convoId, target_user_id);
  res.status(201).json({ success: true, conversation_id: convoId });
});

// Get messages in a conversation
router.get('/conversations/:id/messages', authenticate, (req: AuthRequest, res) => {
  // Verify participant
  const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!participant) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }

  const page = parseInt(req.query.page as string) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  const messages = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.conversation_id=?
    ORDER BY m.created_at DESC LIMIT ? OFFSET ?
  `).all(req.params.id, limit, offset);

  res.json({ success: true, messages: (messages as any[]).reverse(), hasMore: (messages as any[]).length === limit });
});

// CONTEXTUAL DM SEARCH — search messages by keyword + filter by type
router.get('/conversations/:id/search', authenticate, (req: AuthRequest, res) => {
  const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!participant) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }

  const { q, type, date_from, date_to } = req.query as Record<string, string>;
  const conditions: string[] = ['m.conversation_id=?'];
  const params: any[] = [req.params.id];

  if (q?.trim()) { conditions.push("m.content LIKE ?"); params.push(`%${q.trim()}%`); }
  if (type && ['text','image','link','location'].includes(type)) { conditions.push("m.message_type=?"); params.push(type); }
  if (date_from) { conditions.push("m.created_at >= ?"); params.push(parseInt(date_from)); }
  if (date_to) { conditions.push("m.created_at <= ?"); params.push(parseInt(date_to)); }

  const messages = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY m.created_at DESC LIMIT 50
  `).all(...params);

  res.json({ success: true, messages });
});

// MEDIA/LINK INDEX — tabbed dashboard
router.get('/conversations/:id/media-index', authenticate, (req: AuthRequest, res) => {
  const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!participant) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }

  const images = db.prepare(`
    SELECT m.id, m.content, m.metadata, m.created_at, u.username, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.conversation_id=? AND m.message_type='image' ORDER BY m.created_at DESC
  `).all(req.params.id);

  const links = db.prepare(`
    SELECT m.id, m.content, m.metadata, m.created_at, u.username, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.conversation_id=? AND m.message_type='link' ORDER BY m.created_at DESC
  `).all(req.params.id);

  const locations = db.prepare(`
    SELECT m.id, m.content, m.metadata, m.created_at, u.username, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.conversation_id=? AND m.message_type='location' ORDER BY m.created_at DESC
  `).all(req.params.id);

  res.json({ success: true, media_index: { images, links, locations } });
});

// Send text message (HTTP fallback, main via socket)
router.post('/conversations/:id/messages', authenticate, (req: AuthRequest, res) => {
  const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!participant) { res.status(403).json({ success: false, message: 'Not a participant' }); return; }

  const { content, message_type = 'text', metadata } = req.body;
  if (!content?.trim()) { res.status(400).json({ success: false, message: 'Content required' }); return; }

  const msgId = uuidv4();
  db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content,message_type,metadata) VALUES (?,?,?,?,?,?)').run(
    msgId, req.params.id, req.userId, content.trim(), message_type, metadata ? JSON.stringify(metadata) : null
  );
  const message = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?
  `).get(msgId);
  res.status(201).json({ success: true, message });
});

export default router;
