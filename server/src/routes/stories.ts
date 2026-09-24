import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Create story
router.post('/', authenticate, upload.single('media'), (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ success: false, message: 'Media file required' }); return; }
  const { caption } = req.body;
  const storyId = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours
  db.prepare('INSERT INTO stories (id,user_id,media_url,caption,expires_at) VALUES (?,?,?,?,?)').run(
    storyId, req.userId, `/uploads/${req.file.filename}`, caption || '', expiresAt
  );
  const story = db.prepare('SELECT * FROM stories WHERE id=?').get(storyId);
  res.status(201).json({ success: true, story });
});

// Get stories feed (followed users with active stories)
router.get('/feed', authenticate, (req: AuthRequest, res) => {
  const now = Math.floor(Date.now() / 1000);
  const storyUsers = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url,
      COUNT(s.id) as story_count,
      MAX(s.created_at) as latest_story,
      (SELECT 1 FROM story_views sv WHERE sv.story_id=s.id AND sv.viewer_id=?) as has_viewed
    FROM users u
    JOIN stories s ON s.user_id=u.id AND s.expires_at > ?
    WHERE u.id IN (
      SELECT following_id FROM follows WHERE follower_id=? AND status='accepted'
    )
    GROUP BY u.id ORDER BY latest_story DESC
  `).all(req.userId, now, req.userId);
  
  // Also add own stories
  const myStories = db.prepare('SELECT COUNT(*) as count FROM stories WHERE user_id=? AND expires_at>?').get(req.userId, now) as any;
  res.json({ success: true, storyUsers, myStoryCount: myStories.count });
});

// Get all stories for a user
router.get('/user/:userId', authenticate, (req: AuthRequest, res) => {
  const now = Math.floor(Date.now() / 1000);
  const stories = db.prepare(`
    SELECT s.*, (SELECT 1 FROM story_views WHERE story_id=s.id AND viewer_id=?) as is_viewed
    FROM stories s WHERE s.user_id=? AND s.expires_at>? ORDER BY s.created_at ASC
  `).all(req.userId, req.params.userId, now);
  res.json({ success: true, stories });
});

// View a story
router.post('/:id/view', authenticate, (req: AuthRequest, res) => {
  db.prepare('INSERT OR IGNORE INTO story_views (story_id,viewer_id) VALUES (?,?)').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Delete story
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  const story = db.prepare('SELECT user_id FROM stories WHERE id=?').get(req.params.id) as any;
  if (!story || story.user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  db.prepare('DELETE FROM stories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
