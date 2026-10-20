import { Router } from 'express';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPostWithDetails } from './posts';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const viewer = await db.execute({ sql: 'SELECT profile_mode FROM users WHERE id=?', args: [req.userId!] });
  const viewerMode = (viewer.rows[0]?.profile_mode as string) || 'personal';

  // Feed includes user's own posts + posts from accepted followings
  const r = await db.execute({
    sql: `
    SELECT DISTINCT p.id, p.created_at FROM posts p
    LEFT JOIN follows f ON f.following_id=p.user_id AND f.follower_id=? AND f.status='accepted'
    WHERE p.is_published=1
      AND (p.user_id=? OR f.follower_id=?)
      AND (? = 'personal' OR (? = 'professional' AND p.visibility IN ('professional','both')))
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    args: [req.userId!, req.userId!, req.userId!, viewerMode, viewerMode, limit, offset],
  });

  const posts = await Promise.all((r.rows as any[]).map(row => getPostWithDetails(row.id as string, req.userId!)));
  res.json({ success: true, posts: posts.filter(Boolean), hasMore: r.rows.length === limit, page, viewer_mode: viewerMode });
});

router.get('/bookmarks', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT p.id FROM bookmarks b JOIN posts p ON p.id=b.post_id WHERE b.user_id=? AND p.is_published=1 ORDER BY b.created_at DESC LIMIT 50`, args: [req.userId!] });
  const posts = await Promise.all((r.rows as any[]).map(row => getPostWithDetails(row.id as string, req.userId!)));
  res.json({ success: true, posts: posts.filter(Boolean) });
});

export default router;
