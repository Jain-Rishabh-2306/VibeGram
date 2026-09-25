import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all notifications
router.get('/', authenticate, (req: AuthRequest, res) => {
  const notifications = db.prepare(`
    SELECT n.*, u.username as actor_username, u.full_name as actor_name, u.avatar_url as actor_avatar
    FROM notifications n JOIN users u ON u.id=n.actor_id
    WHERE n.recipient_id=?
    ORDER BY n.created_at DESC LIMIT 50
  `).all(req.userId);
  res.json({ success: true, notifications });
});

// Get unread count
router.get('/unread-count', authenticate, (req: AuthRequest, res) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE recipient_id=? AND is_read=0').get(req.userId) as any;
  res.json({ success: true, count: result.count });
});

// Mark notification as read
router.patch('/:id/read', authenticate, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND recipient_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Mark all as read
router.patch('/read-all', authenticate, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE recipient_id=?').run(req.userId);
  res.json({ success: true });
});

export default router;
