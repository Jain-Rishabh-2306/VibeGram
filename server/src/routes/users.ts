import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Get user profile by username
router.get('/:username', authenticate, (req: AuthRequest, res) => {
  const { username } = req.params;
  const user = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url, u.website, u.is_private, u.is_verified, u.profile_mode, u.created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id=u.id AND status='accepted') as followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id=u.id AND status='accepted') as following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id=u.id AND is_published=1) as posts_count,
      CASE WHEN ? = u.id THEN 1 ELSE 0 END as is_own_profile,
      (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM users u WHERE u.username=?
  `).get(req.userId, req.userId, username) as any;

  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, user });
});

// Update profile
router.put('/me/profile', authenticate, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      full_name: z.string().min(1).max(60).optional(),
      bio: z.string().max(150).optional(),
      website: z.string().url().optional().or(z.literal('')),
      is_private: z.coerce.boolean().optional(),
    });
    const data = schema.parse(req.body);
    let avatarUrl = undefined;
    if (req.file) avatarUrl = `/uploads/${req.file.filename}`;

    const updates: string[] = [];
    const values: any[] = [];
    if (data.full_name !== undefined) { updates.push('full_name=?'); values.push(data.full_name); }
    if (data.bio !== undefined) { updates.push('bio=?'); values.push(data.bio); }
    if (data.website !== undefined) { updates.push('website=?'); values.push(data.website); }
    if (data.is_private !== undefined) { updates.push('is_private=?'); values.push(data.is_private ? 1 : 0); }
    if (avatarUrl) { updates.push('avatar_url=?'); values.push(avatarUrl); }
    if (updates.length === 0) { res.status(400).json({ success: false, message: 'Nothing to update' }); return; }
    updates.push('updated_at=?'); values.push(Math.floor(Date.now() / 1000));
    values.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(',')} WHERE id=?`).run(...values);
    const user = db.prepare('SELECT id,username,email,full_name,bio,avatar_url,website,is_private,is_verified,profile_mode FROM users WHERE id=?').get(req.userId);
    res.json({ success: true, user });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message });
    else next(err);
  }
});

// Toggle profile mode (personal/professional)
router.patch('/me/profile-mode', authenticate, (req: AuthRequest, res) => {
  const { mode } = req.body;
  if (!['personal', 'professional'].includes(mode)) {
    res.status(400).json({ success: false, message: 'Mode must be personal or professional' }); return;
  }
  db.prepare('UPDATE users SET profile_mode=?,updated_at=? WHERE id=?').run(mode, Math.floor(Date.now() / 1000), req.userId);
  res.json({ success: true, profile_mode: mode });
});

// Tag a follower as professional or personal contact
router.patch('/me/contacts/:followerId/tag', authenticate, (req: AuthRequest, res) => {
  const { followerId } = req.params;
  const { contact_type } = req.body;
  if (!['personal', 'professional'].includes(contact_type)) {
    res.status(400).json({ success: false, message: 'contact_type must be personal or professional' }); return;
  }
  const rel = db.prepare('SELECT * FROM follows WHERE follower_id=? AND following_id=?').get(followerId, req.userId);
  if (!rel) { res.status(404).json({ success: false, message: 'Follower not found' }); return; }
  db.prepare('UPDATE follows SET contact_type=? WHERE follower_id=? AND following_id=?').run(contact_type, followerId, req.userId);
  res.json({ success: true, contact_type });
});

// Get followers list
router.get('/:username/followers', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username=?').get(req.params.username) as any;
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const followers = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, f.contact_type,
      (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM follows f JOIN users u ON u.id=f.follower_id
    WHERE f.following_id=? AND f.status='accepted'
    ORDER BY f.created_at DESC LIMIT 100
  `).all(req.userId, user.id);
  res.json({ success: true, followers });
});

// Get following list
router.get('/:username/following', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username=?').get(req.params.username) as any;
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const following = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, f.contact_type,
      (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM follows f JOIN users u ON u.id=f.following_id
    WHERE f.follower_id=? AND f.status='accepted'
    ORDER BY f.created_at DESC LIMIT 100
  `).all(req.userId, user.id);
  res.json({ success: true, following });
});

// Follow / Unfollow
router.post('/:userId/follow', authenticate, (req: AuthRequest, res) => {
  const targetId = req.params.userId;
  if (targetId === req.userId) { res.status(400).json({ success: false, message: 'Cannot follow yourself' }); return; }
  const target = db.prepare('SELECT id, is_private FROM users WHERE id=?').get(targetId) as any;
  if (!target) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const existing = db.prepare('SELECT * FROM follows WHERE follower_id=? AND following_id=?').get(req.userId, targetId);
  if (existing) {
    // Unfollow
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.userId, targetId);
    res.json({ success: true, action: 'unfollowed' });
  } else {
    const status = target.is_private ? 'pending' : 'accepted';
    db.prepare('INSERT INTO follows (follower_id,following_id,status) VALUES (?,?,?)').run(req.userId, targetId, status);
    // Create notification
    if (status === 'accepted') {
      db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
        uuidv4(), targetId, req.userId, 'follow', req.userId, 'user'
      );
    }
    res.json({ success: true, action: status === 'accepted' ? 'followed' : 'requested' });
  }
});

// Get user's posts (grid view)
router.get('/:username/posts', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, is_private FROM users WHERE username=?').get(req.params.username) as any;
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  
  // Check viewing permissions
  const isOwn = user.id === req.userId;
  const isFollowing = db.prepare("SELECT 1 FROM follows WHERE follower_id=? AND following_id=? AND status='accepted'").get(req.userId, user.id);
  
  // Determine what visibility to show
  let visibilityFilter = "AND p.visibility IN ('professional','both')";
  if (isOwn) { visibilityFilter = ''; }
  else if (isFollowing) {
    const viewerMode = db.prepare('SELECT profile_mode FROM users WHERE id=?').get(req.userId) as any;
    const contactType = db.prepare('SELECT contact_type FROM follows WHERE follower_id=? AND following_id=?').get(req.userId, user.id) as any;
    if (viewerMode?.profile_mode === 'professional' || contactType?.contact_type === 'professional') {
      visibilityFilter = "AND p.visibility IN ('professional','both')";
    } else {
      visibilityFilter = ''; // personal can see all
    }
  }

  const posts = db.prepare(`
    SELECT p.id, p.caption, p.created_at, p.visibility, p.sensitivity_label, p.is_time_capsule, p.publish_at,
      (SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count
    FROM posts p
    WHERE p.user_id=? AND p.is_published=1 ${visibilityFilter}
    ORDER BY p.created_at DESC LIMIT 50
  `).all(user.id);

  res.json({ success: true, posts });
});

export default router;
