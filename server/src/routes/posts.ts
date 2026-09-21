import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Create a post
router.post('/', authenticate, upload.array('media', 10), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      caption: z.string().max(2200).optional().default(''),
      location: z.string().max(100).optional().default(''),
      visibility: z.enum(['personal', 'professional', 'both']).optional().default('both'),
      sensitivity_label: z.enum(['spoiler', 'sensitive', 'satire']).nullable().optional(),
      is_time_capsule: z.coerce.boolean().optional().default(false),
      publish_at: z.coerce.number().optional(),
      hashtags: z.string().optional(), // comma-separated
      links: z.string().optional(), // JSON array of {url, display_text}
      // Poll data
      poll_question: z.string().optional(),
      poll_options: z.string().optional(), // JSON array of strings
      poll_duration_hours: z.coerce.number().min(1).max(168).optional().default(24),
    });

    const data = schema.parse(req.body);
    const files = req.files as Express.Multer.File[];
    
    if (!files?.length) { res.status(400).json({ success: false, message: 'At least one image is required' }); return; }

    const postId = uuidv4();
    const isPublished = data.is_time_capsule && data.publish_at ? 0 : 1;

    db.prepare(`
      INSERT INTO posts (id,user_id,caption,location,visibility,sensitivity_label,is_time_capsule,publish_at,is_published)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
      postId, req.userId!, data.caption, data.location, data.visibility,
      data.sensitivity_label || null,
      data.is_time_capsule ? 1 : 0,
      data.publish_at || null,
      isPublished
    );

    // Insert media
    files.forEach((file, idx) => {
      const isGif = file.originalname.endsWith('.gif');
      db.prepare('INSERT INTO post_media (id,post_id,media_url,media_type,order_index) VALUES (?,?,?,?,?)').run(
        uuidv4(), postId, `/uploads/${file.filename}`, isGif ? 'gif' : 'image', idx
      );
    });

    // Handle hashtags
    if (data.hashtags) {
      const tags = data.hashtags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      for (const tag of tags) {
        let htag = db.prepare('SELECT id FROM hashtags WHERE tag=?').get(tag) as any;
        if (!htag) {
          const hid = uuidv4();
          db.prepare('INSERT INTO hashtags (id,tag) VALUES (?,?)').run(hid, tag);
          htag = { id: hid };
        }
        db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id,hashtag_id) VALUES (?,?)').run(postId, htag.id);
      }
    }

    // Handle in-caption links
    if (data.links) {
      try {
        const links = JSON.parse(data.links) as Array<{ url: string; display_text: string }>;
        for (const link of links) {
          db.prepare('INSERT INTO post_links (id,post_id,url,display_text) VALUES (?,?,?,?)').run(
            uuidv4(), postId, link.url, link.display_text
          );
        }
      } catch { /* invalid links JSON, skip */ }
    }

    // Handle VibeCheck Poll
    if (data.poll_question && data.poll_options) {
      try {
        const options = JSON.parse(data.poll_options) as string[];
        if (options.length >= 2) {
          const pollId = uuidv4();
          const closesAt = Math.floor(Date.now() / 1000) + (data.poll_duration_hours * 3600);
          db.prepare('INSERT INTO polls (id,post_id,question,closes_at) VALUES (?,?,?,?)').run(pollId, postId, data.poll_question, closesAt);
          options.forEach((opt, idx) => {
            db.prepare('INSERT INTO poll_options (id,poll_id,option_text,order_index) VALUES (?,?,?,?)').run(uuidv4(), pollId, opt, idx);
          });
        }
      } catch { /* invalid poll JSON, skip */ }
    }

    const post = getPostWithDetails(postId, req.userId!);
    res.status(201).json({ success: true, post });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message });
    else next(err);
  }
});

function getPostWithDetails(postId: string, currentUserId: string) {
  const post = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url, u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count,
      (SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=?) as is_bookmarked
    FROM posts p JOIN users u ON u.id=p.user_id
    WHERE p.id=?
  `).get(currentUserId, currentUserId, postId) as any;
  
  if (!post) return null;
  
  post.media = db.prepare('SELECT * FROM post_media WHERE post_id=? ORDER BY order_index').all(postId);
  post.links = db.prepare('SELECT * FROM post_links WHERE post_id=?').all(postId);
  
  // Attach poll if exists
  const poll = db.prepare('SELECT * FROM polls WHERE post_id=?').get(postId) as any;
  if (poll) {
    poll.options = db.prepare(`
      SELECT po.*, COUNT(pv.user_id) as vote_count
      FROM poll_options po LEFT JOIN poll_votes pv ON pv.option_id=po.id
      WHERE po.poll_id=? GROUP BY po.id ORDER BY po.order_index
    `).all(poll.id);
    const totalVotes = poll.options.reduce((s: number, o: any) => s + o.vote_count, 0);
    poll.total_votes = totalVotes;
    const myVote = db.prepare('SELECT option_id FROM poll_votes WHERE poll_id=? AND user_id=?').get(poll.id, currentUserId) as any;
    poll.my_vote = myVote?.option_id || null;
    post.poll = poll;
  }
  
  return post;
}

// Get single post
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  const post = getPostWithDetails(req.params.id, req.userId!);
  if (!post) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
  res.json({ success: true, post });
});

// Delete post
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(req.params.id) as any;
  if (!post) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
  if (post.user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ success: true, message: 'Post deleted' });
});

// Like / Unlike
router.post('/:id/like', authenticate, (req: AuthRequest, res) => {
  const postId = req.params.id;
  const existing = db.prepare('SELECT 1 FROM likes WHERE post_id=? AND user_id=?').get(postId, req.userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id=? AND user_id=?').run(postId, req.userId);
    res.json({ success: true, liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id,user_id) VALUES (?,?)').run(postId, req.userId);
    const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(postId) as any;
    if (post && post.user_id !== req.userId) {
      db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
        uuidv4(), post.user_id, req.userId, 'like', postId, 'post'
      );
    }
    res.json({ success: true, liked: true });
  }
});

// Bookmark / Unbookmark
router.post('/:id/bookmark', authenticate, (req: AuthRequest, res) => {
  const postId = req.params.id;
  const existing = db.prepare('SELECT 1 FROM bookmarks WHERE post_id=? AND user_id=?').get(postId, req.userId);
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE post_id=? AND user_id=?').run(postId, req.userId);
    res.json({ success: true, bookmarked: false });
  } else {
    db.prepare('INSERT INTO bookmarks (post_id,user_id) VALUES (?,?)').run(postId, req.userId);
    res.json({ success: true, bookmarked: true });
  }
});

// Get comments
router.get('/:id/comments', authenticate, (req: AuthRequest, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.full_name, u.avatar_url, u.is_verified,
      (SELECT COUNT(*) FROM comments sub WHERE sub.parent_id=c.id) as reply_count
    FROM comments c JOIN users u ON u.id=c.user_id
    WHERE c.post_id=? AND c.parent_id IS NULL
    ORDER BY c.created_at DESC LIMIT 50
  `).all(req.params.id);
  res.json({ success: true, comments });
});

// Add comment
router.post('/:id/comments', authenticate, (req: AuthRequest, res) => {
  const { content, parent_id } = req.body;
  if (!content?.trim()) { res.status(400).json({ success: false, message: 'Comment cannot be empty' }); return; }
  const commentId = uuidv4();
  db.prepare('INSERT INTO comments (id,post_id,user_id,parent_id,content) VALUES (?,?,?,?,?)').run(
    commentId, req.params.id, req.userId, parent_id || null, content.trim()
  );
  const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(req.params.id) as any;
  if (post && post.user_id !== req.userId) {
    db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
      uuidv4(), post.user_id, req.userId, 'comment', commentId, 'comment'
    );
  }
  const comment = db.prepare(`
    SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?
  `).get(commentId);
  res.status(201).json({ success: true, comment });
});

// Vote on poll
router.post('/:id/poll/vote', authenticate, (req: AuthRequest, res) => {
  const { option_id } = req.body;
  const poll = db.prepare('SELECT * FROM polls WHERE post_id=?').get(req.params.id) as any;
  if (!poll) { res.status(404).json({ success: false, message: 'No poll on this post' }); return; }
  if (poll.closes_at < Math.floor(Date.now() / 1000)) { res.status(400).json({ success: false, message: 'Poll has closed' }); return; }
  const option = db.prepare('SELECT id FROM poll_options WHERE id=? AND poll_id=?').get(option_id, poll.id);
  if (!option) { res.status(400).json({ success: false, message: 'Invalid option' }); return; }
  db.prepare('INSERT OR REPLACE INTO poll_votes (poll_id,user_id,option_id) VALUES (?,?,?)').run(poll.id, req.userId, option_id);
  // Return updated poll
  const options = db.prepare(`
    SELECT po.*, COUNT(pv.user_id) as vote_count
    FROM poll_options po LEFT JOIN poll_votes pv ON pv.option_id=po.id
    WHERE po.poll_id=? GROUP BY po.id ORDER BY po.order_index
  `).all(poll.id);
  const totalVotes = (options as any[]).reduce((s, o) => s + o.vote_count, 0);
  res.json({ success: true, poll: { ...poll, options, total_votes: totalVotes, my_vote: option_id } });
});

export { getPostWithDetails };
export default router;
