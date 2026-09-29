import { Router } from 'express';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/search', authenticate, async (req: AuthRequest, res) => {
  const { q, type = 'all' } = req.query as Record<string, string>;
  if (!q?.trim()) { res.json({ success: true, users: [], posts: [], hashtags: [] }); return; }
  const query = `%${q.trim()}%`;
  const results: Record<string, any[]> = { users: [], posts: [], hashtags: [] };
  if (type === 'all' || type === 'users') {
    const r = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,u.bio,u.is_verified,(SELECT COUNT(*) FROM follows WHERE following_id=u.id AND status='accepted') as followers_count,(SELECT status FROM follows WHERE follower_id=? AND following_id=u.id) as follow_status FROM users u WHERE (u.username LIKE ? OR u.full_name LIKE ?) AND u.id!=? ORDER BY followers_count DESC LIMIT 20`, args: [req.userId!, query, query, req.userId!] });
    results.users = r.rows as any[];
  }
  if (type === 'all' || type === 'posts') {
    const r = await db.execute({ sql: `SELECT p.id,p.caption,(SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail,(SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,u.username,u.avatar_url FROM posts p JOIN users u ON u.id=p.user_id WHERE p.caption LIKE ? AND p.is_published=1 ORDER BY likes_count DESC LIMIT 20`, args: [query] });
    results.posts = r.rows as any[];
  }
  if (type === 'all' || type === 'hashtags') {
    const r = await db.execute({ sql: `SELECT h.tag,COUNT(ph.post_id) as post_count FROM hashtags h LEFT JOIN post_hashtags ph ON ph.hashtag_id=h.id WHERE h.tag LIKE ? GROUP BY h.id ORDER BY post_count DESC LIMIT 10`, args: [query] });
    results.hashtags = r.rows as any[];
  }
  res.json({ success: true, ...results });
});

router.get('/posts', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1; const limit = 18; const offset = (page - 1) * limit;
  const r = await db.execute({ sql: `SELECT p.id,p.caption,p.sensitivity_label,(SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail,(SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,(SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count,u.id as user_id,u.username,u.avatar_url FROM posts p JOIN users u ON u.id=p.user_id WHERE p.is_published=1 AND p.visibility IN ('both') AND p.user_id!=? ORDER BY likes_count DESC,p.created_at DESC LIMIT ? OFFSET ?`, args: [req.userId!, limit, offset] });
  res.json({ success: true, posts: r.rows, hasMore: r.rows.length === limit });
});

router.get('/suggestions', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT u.id,u.username,u.full_name,u.avatar_url,u.bio,u.is_verified,(SELECT COUNT(*) FROM follows WHERE following_id=u.id AND status='accepted') as followers_count FROM users u WHERE u.id!=? AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id=? AND status='accepted') ORDER BY followers_count DESC,u.created_at DESC LIMIT 10`, args: [req.userId!, req.userId!] });
  res.json({ success: true, suggestions: r.rows });
});

export default router;
