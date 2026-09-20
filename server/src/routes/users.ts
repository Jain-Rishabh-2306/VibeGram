import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/:username', authenticate, async (req: AuthRequest, res) => {
  const { username } = req.params;
  const r = await db.execute({ sql: `
    SELECT u.id,u.username,u.full_name,u.bio,u.avatar_url,u.website,u.is_private,u.is_verified,u.profile_mode,u.created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id=u.id AND status='accepted') as followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id=u.id AND status='accepted') as following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id=u.id AND is_published=1) as posts_count,
      CASE WHEN ? = u.id THEN 1 ELSE 0 END as is_own_profile,
      (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM users u WHERE u.username=?`, args: [req.userId!, req.userId!, username] });
  if (!r.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, user: r.rows[0] });
});

router.put('/me/profile', authenticate, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({ full_name: z.string().min(1).max(60).optional(), bio: z.string().max(150).optional(), website: z.string().optional(), is_private: z.coerce.boolean().optional() });
    const data = schema.parse(req.body);
    const updates: string[] = []; const values: any[] = [];
    if (data.full_name !== undefined) { updates.push('full_name=?'); values.push(data.full_name); }
    if (data.bio !== undefined) { updates.push('bio=?'); values.push(data.bio); }
    if (data.website !== undefined) { updates.push('website=?'); values.push(data.website); }
    if (data.is_private !== undefined) { updates.push('is_private=?'); values.push(data.is_private ? 1 : 0); }
    if (req.file) { updates.push('avatar_url=?'); values.push(`/uploads/${req.file.filename}`); }
    if (updates.length === 0) { res.status(400).json({ success: false, message: 'Nothing to update' }); return; }
    updates.push('updated_at=?'); values.push(Math.floor(Date.now() / 1000)); values.push(req.userId!);
    await db.execute({ sql: `UPDATE users SET ${updates.join(',')} WHERE id=?`, args: values });
    const userRes = await db.execute({ sql: 'SELECT id,username,email,full_name,bio,avatar_url,website,is_private,is_verified,profile_mode FROM users WHERE id=?', args: [req.userId!] });
    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) { if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message }); else next(err); }
});

router.patch('/me/profile-mode', authenticate, async (req: AuthRequest, res) => {
  const { mode } = req.body;
  if (!['personal', 'professional'].includes(mode)) { res.status(400).json({ success: false, message: 'Mode must be personal or professional' }); return; }
  await db.execute({ sql: 'UPDATE users SET profile_mode=?,updated_at=? WHERE id=?', args: [mode, Math.floor(Date.now() / 1000), req.userId!] });
  res.json({ success: true, profile_mode: mode });
});

router.patch('/me/contacts/:followerId/tag', authenticate, async (req: AuthRequest, res) => {
  const { followerId } = req.params; const { contact_type } = req.body;
  if (!['personal', 'professional'].includes(contact_type)) { res.status(400).json({ success: false, message: 'Invalid contact_type' }); return; }
  const rel = await db.execute({ sql: 'SELECT * FROM follows WHERE follower_id=? AND following_id=?', args: [followerId, req.userId!] });
  if (!rel.rows[0]) { res.status(404).json({ success: false, message: 'Follower not found' }); return; }
  await db.execute({ sql: 'UPDATE follows SET contact_type=? WHERE follower_id=? AND following_id=?', args: [contact_type, followerId, req.userId!] });
  res.json({ success: true, contact_type });
});

router.get('/:username/followers', authenticate, async (req: AuthRequest, res) => {
  const user = await db.execute({ sql: 'SELECT id FROM users WHERE username=?', args: [req.params.username] });
  if (!user.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const uid = user.rows[0].id as string;
  const followers = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,u.is_verified,f.contact_type,
    (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.following_id=? AND f.status='accepted' ORDER BY f.created_at DESC LIMIT 100`, args: [req.userId!, uid] });
  res.json({ success: true, followers: followers.rows });
});

router.get('/:username/following', authenticate, async (req: AuthRequest, res) => {
  const user = await db.execute({ sql: 'SELECT id FROM users WHERE username=?', args: [req.params.username] });
  if (!user.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const uid = user.rows[0].id as string;
  const following = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,u.is_verified,f.contact_type,
    (SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status
    FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=? AND f.status='accepted' ORDER BY f.created_at DESC LIMIT 100`, args: [req.userId!, uid] });
  res.json({ success: true, following: following.rows });
});

router.post('/:userId/follow', authenticate, async (req: AuthRequest, res) => {
  const targetId = req.params.userId;
  if (targetId === req.userId) { res.status(400).json({ success: false, message: 'Cannot follow yourself' }); return; }
  const target = await db.execute({ sql: 'SELECT id,is_private FROM users WHERE id=?', args: [targetId] });
  if (!target.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const existing = await db.execute({ sql: 'SELECT * FROM follows WHERE follower_id=? AND following_id=?', args: [req.userId!, targetId] });
  if (existing.rows[0]) {
    await db.execute({ sql: 'DELETE FROM follows WHERE follower_id=? AND following_id=?', args: [req.userId!, targetId] });
    res.json({ success: true, action: 'unfollowed' });
  } else {
    const status = (target.rows[0].is_private as number) ? 'pending' : 'accepted';
    await db.execute({ sql: 'INSERT INTO follows (follower_id,following_id,status) VALUES (?,?,?)', args: [req.userId!, targetId, status] });
    if (status === 'accepted') {
      await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), targetId, req.userId!, 'follow', req.userId!, 'user'] });
    }
    res.json({ success: true, action: status === 'accepted' ? 'followed' : 'requested' });
  }
});

router.get('/:username/posts', authenticate, async (req: AuthRequest, res) => {
  const user = await db.execute({ sql: 'SELECT id,is_private FROM users WHERE username=?', args: [req.params.username] });
  if (!user.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  const uid = user.rows[0].id as string;
  const isOwn = uid === req.userId;
  const isFollowingRes = await db.execute({ sql: "SELECT 1 FROM follows WHERE follower_id=? AND following_id=? AND status='accepted'", args: [req.userId!, uid] });
  const isFollowing = isFollowingRes.rows.length > 0;
  let visibilityFilter = "AND p.visibility IN ('professional','both')";
  if (isOwn) { visibilityFilter = ''; }
  else if (isFollowing) { visibilityFilter = ''; }
  const posts = await db.execute({ sql: `SELECT p.id,p.caption,p.created_at,p.visibility,p.sensitivity_label,p.is_time_capsule,p.publish_at,
    (SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail,
    (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
    (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count
    FROM posts p WHERE p.user_id=? AND p.is_published=1 ${visibilityFilter} ORDER BY p.created_at DESC LIMIT 50`, args: [uid] });
  res.json({ success: true, posts: posts.rows });
});

export default router;
