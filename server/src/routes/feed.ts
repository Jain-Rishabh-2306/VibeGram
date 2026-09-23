import { Router } from 'express';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Home feed — respects dual-profile mode
router.get('/', authenticate, (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  // Get viewer's current mode
  const viewer = db.prepare('SELECT profile_mode FROM users WHERE id=?').get(req.userId) as any;
  const viewerMode = viewer?.profile_mode || 'personal';

  // Build visibility filter based on viewer mode
  // If viewer is in professional mode → only see professional/both posts from professional contacts
  // If viewer is in personal mode → see all posts from all contacts
  const posts = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url, u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count,
      (SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=?) as is_bookmarked,
      (SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN follows f ON f.following_id = p.user_id AND f.follower_id = ?
    WHERE p.is_published = 1
      AND f.status = 'accepted'
      AND (
        ? = 'personal'
        OR (? = 'professional' AND (p.visibility IN ('professional','both') AND f.contact_type = 'professional'))
        OR (? = 'professional' AND f.contact_type = 'personal')
      )
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.userId, req.userId, req.userId, viewerMode, viewerMode, viewerMode, limit, offset) as any[];

  // Attach media arrays
  for (const post of posts) {
    post.media = db.prepare('SELECT * FROM post_media WHERE post_id=? ORDER BY order_index').all(post.id);
    post.links = db.prepare('SELECT * FROM post_links WHERE post_id=?').all(post.id);
    const poll = db.prepare('SELECT * FROM polls WHERE post_id=?').get(post.id) as any;
    if (poll) {
      poll.options = db.prepare(`
        SELECT po.*, COUNT(pv.user_id) as vote_count
        FROM poll_options po LEFT JOIN poll_votes pv ON pv.option_id=po.id
        WHERE po.poll_id=? GROUP BY po.id ORDER BY po.order_index
      `).all(poll.id) as any[];
      poll.total_votes = poll.options.reduce((s: number, o: any) => s + o.vote_count, 0);
      const myVote = db.prepare('SELECT option_id FROM poll_votes WHERE poll_id=? AND user_id=?').get(poll.id, req.userId) as any;
      poll.my_vote = myVote?.option_id || null;
      post.poll = poll;
    }
  }

  const hasMore = posts.length === limit;
  res.json({ success: true, posts, hasMore, page, viewer_mode: viewerMode });
});

// Bookmarked posts
router.get('/bookmarks', authenticate, (req: AuthRequest, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url,
      (SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count
    FROM bookmarks b JOIN posts p ON p.id=b.post_id JOIN users u ON u.id=p.user_id
    WHERE b.user_id=? AND p.is_published=1
    ORDER BY b.created_at DESC LIMIT 50
  `).all(req.userId);
  res.json({ success: true, posts });
});

export default router;
