import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { uploadToStorage } from '../config/storage';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', authenticate, upload.single('media'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ success: false, message: 'Media file required' }); return; }
  const { caption } = req.body;
  const storyId = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600;
  const mediaUrl = await uploadToStorage(req.file.path, req.file.filename, req.file.mimetype);
  await db.execute({ sql: 'INSERT INTO stories (id,user_id,media_url,caption,expires_at) VALUES (?,?,?,?,?)', args: [storyId, req.userId!, mediaUrl, caption || '', expiresAt] });
  const story = await db.execute({ sql: 'SELECT * FROM stories WHERE id=?', args: [storyId] });
  res.status(201).json({ success: true, story: story.rows[0] });
});

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  const now = Math.floor(Date.now() / 1000);
  const r = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,COUNT(s.id) as story_count,MAX(s.created_at) as latest_story
    FROM users u JOIN stories s ON s.user_id=u.id AND s.expires_at>?
    WHERE u.id IN (SELECT following_id FROM follows WHERE follower_id=? AND status='accepted')
    GROUP BY u.id ORDER BY latest_story DESC`, args: [now, req.userId!] });
  const myStories = await db.execute({ sql: 'SELECT * FROM stories WHERE user_id=? AND expires_at>? ORDER BY created_at ASC', args: [req.userId!, now] });
  res.json({
    success: true,
    storyUsers: r.rows,
    myStories: myStories.rows,
    myStoryCount: myStories.rows.length
  });
});

router.get('/user/:userId', authenticate, async (req: AuthRequest, res) => {
  const now = Math.floor(Date.now() / 1000);
  const r = await db.execute({ sql: `SELECT s.*,(SELECT 1 FROM story_views WHERE story_id=s.id AND viewer_id=?) as is_viewed
    FROM stories s WHERE s.user_id=? AND s.expires_at>? ORDER BY s.created_at ASC`, args: [req.userId!, req.params.userId, now] });
  res.json({ success: true, stories: r.rows });
});

router.post('/:id/view', authenticate, async (req: AuthRequest, res) => {
  await db.execute({ sql: 'INSERT OR IGNORE INTO story_views (story_id,viewer_id) VALUES (?,?)', args: [req.params.id, req.userId!] });
  res.json({ success: true });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: 'SELECT user_id FROM stories WHERE id=?', args: [req.params.id] });
  if (!r.rows[0] || r.rows[0].user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  await db.execute({ sql: 'DELETE FROM stories WHERE id=?', args: [req.params.id] });
  res.json({ success: true });
});

export default router;
