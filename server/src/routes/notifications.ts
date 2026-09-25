import { Router } from 'express';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT n.*,u.username as actor_username,u.full_name as actor_name,u.avatar_url as actor_avatar
    FROM notifications n JOIN users u ON u.id=n.actor_id WHERE n.recipient_id=? ORDER BY n.created_at DESC LIMIT 50`, args: [req.userId!] });
  res.json({ success: true, notifications: r.rows });
});

router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: 'SELECT COUNT(*) as count FROM notifications WHERE recipient_id=? AND is_read=0', args: [req.userId!] });
  res.json({ success: true, count: (r.rows[0] as any).count });
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  await db.execute({ sql: 'UPDATE notifications SET is_read=1 WHERE id=? AND recipient_id=?', args: [req.params.id, req.userId!] });
  res.json({ success: true });
});

router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  await db.execute({ sql: 'UPDATE notifications SET is_read=1 WHERE recipient_id=?', args: [req.userId!] });
  res.json({ success: true });
});

export default router;
