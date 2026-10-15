import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { uploadToStorage } from '../config/r2';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', authenticate, upload.array('media', 10), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      caption: z.string().max(2200).optional().default(''),
      location: z.string().max(100).optional().default(''),
      visibility: z.enum(['personal','professional','both']).optional().default('both'),
      sensitivity_label: z.enum(['spoiler','sensitive','satire']).nullable().optional(),
      is_time_capsule: z.coerce.boolean().optional().default(false),
      publish_at: z.coerce.number().optional(),
      hashtags: z.string().optional(),
      links: z.string().optional(),
      poll_question: z.string().optional(),
      poll_options: z.string().optional(),
      poll_duration_hours: z.coerce.number().min(1).max(168).optional().default(24),
    });
    const data = schema.parse(req.body);
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ success: false, message: 'At least one image is required' }); return; }
    const postId = uuidv4();
    const isPublished = data.is_time_capsule && data.publish_at ? 0 : 1;
    await db.execute({ sql: 'INSERT INTO posts (id,user_id,caption,location,visibility,sensitivity_label,is_time_capsule,publish_at,is_published) VALUES (?,?,?,?,?,?,?,?,?)', args: [postId, req.userId!, data.caption, data.location, data.visibility, data.sensitivity_label ?? null, data.is_time_capsule ? 1 : 0, data.publish_at ?? null, isPublished] });
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const isGif = file.originalname.endsWith('.gif');
      const mediaUrl = await uploadToStorage(file.path, file.filename, file.mimetype);
      await db.execute({ sql: 'INSERT INTO post_media (id,post_id,media_url,media_type,order_index) VALUES (?,?,?,?,?)', args: [uuidv4(), postId, mediaUrl, isGif ? 'gif' : 'image', idx] });
    }
    if (data.hashtags) {
      const tags = data.hashtags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      for (const tag of tags) {
        const htag = await db.execute({ sql: 'SELECT id FROM hashtags WHERE tag=?', args: [tag] });
        let hid = htag.rows[0]?.id as string;
        if (!hid) { hid = uuidv4(); await db.execute({ sql: 'INSERT INTO hashtags (id,tag) VALUES (?,?)', args: [hid, tag] }); }
        await db.execute({ sql: 'INSERT OR IGNORE INTO post_hashtags (post_id,hashtag_id) VALUES (?,?)', args: [postId, hid] });
      }
    }
    if (data.links) {
      try {
        const links = JSON.parse(data.links) as Array<{ url: string; display_text: string }>;
        for (const link of links) { await db.execute({ sql: 'INSERT INTO post_links (id,post_id,url,display_text) VALUES (?,?,?,?)', args: [uuidv4(), postId, link.url, link.display_text] }); }
      } catch { /* skip invalid links */ }
    }
    if (data.poll_question && data.poll_options) {
      try {
        const options = JSON.parse(data.poll_options) as string[];
        if (options.length >= 2) {
          const pollId = uuidv4();
          const closesAt = Math.floor(Date.now() / 1000) + (data.poll_duration_hours * 3600);
          await db.execute({ sql: 'INSERT INTO polls (id,post_id,question,closes_at) VALUES (?,?,?,?)', args: [pollId, postId, data.poll_question, closesAt] });
          for (let i = 0; i < options.length; i++) { await db.execute({ sql: 'INSERT INTO poll_options (id,poll_id,option_text,order_index) VALUES (?,?,?,?)', args: [uuidv4(), pollId, options[i], i] }); }
        }
      } catch { /* skip */ }
    }
    const post = await getPostWithDetails(postId, req.userId!);
    res.status(201).json({ success: true, post });
  } catch (err) { if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message }); else next(err); }
});

export async function getPostWithDetails(postId: string, currentUserId: string) {
  const r = await db.execute({ sql: `
    SELECT p.*,u.username,u.full_name,u.avatar_url,u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id=p.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id=p.id) as comments_count,
      (SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=?) as is_bookmarked
    FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=?`, args: [currentUserId, currentUserId, postId] });
  if (!r.rows[0]) return null;
  const post = r.rows[0] as any;
  const media = await db.execute({ sql: 'SELECT * FROM post_media WHERE post_id=? ORDER BY order_index', args: [postId] });
  post.media = media.rows;
  const links = await db.execute({ sql: 'SELECT * FROM post_links WHERE post_id=?', args: [postId] });
  post.links = links.rows;
  const poll = await db.execute({ sql: 'SELECT * FROM polls WHERE post_id=?', args: [postId] });
  if (poll.rows[0]) {
    const p = poll.rows[0] as any;
    const opts = await db.execute({ sql: 'SELECT po.*,(SELECT COUNT(*) FROM poll_votes WHERE option_id=po.id) as vote_count FROM poll_options po WHERE po.poll_id=? ORDER BY po.order_index', args: [p.id] });
    p.options = opts.rows;
    p.total_votes = (opts.rows as any[]).reduce((s, o) => s + (o.vote_count as number), 0);
    const mv = await db.execute({ sql: 'SELECT option_id FROM poll_votes WHERE poll_id=? AND user_id=?', args: [p.id, currentUserId] });
    p.my_vote = mv.rows[0]?.option_id ?? null;
    post.poll = p;
  }
  return post;
}

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const post = await getPostWithDetails(req.params.id, req.userId!);
  if (!post) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
  res.json({ success: true, post });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: 'SELECT user_id FROM posts WHERE id=?', args: [req.params.id] });
  if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
  if (r.rows[0].user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  await db.execute({ sql: 'DELETE FROM posts WHERE id=?', args: [req.params.id] });
  res.json({ success: true });
});

router.post('/:id/like', authenticate, async (req: AuthRequest, res) => {
  const postId = req.params.id;
  const existing = await db.execute({ sql: 'SELECT 1 FROM likes WHERE post_id=? AND user_id=?', args: [postId, req.userId!] });
  if (existing.rows[0]) {
    await db.execute({ sql: 'DELETE FROM likes WHERE post_id=? AND user_id=?', args: [postId, req.userId!] });
    res.json({ success: true, liked: false });
  } else {
    await db.execute({ sql: 'INSERT INTO likes (post_id,user_id) VALUES (?,?)', args: [postId, req.userId!] });
    const post = await db.execute({ sql: 'SELECT user_id FROM posts WHERE id=?', args: [postId] });
    if (post.rows[0] && post.rows[0].user_id !== req.userId) {
      await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), post.rows[0].user_id!, req.userId!, 'like', postId, 'post'] });
    }
    res.json({ success: true, liked: true });
  }
});

router.post('/:id/bookmark', authenticate, async (req: AuthRequest, res) => {
  const postId = req.params.id;
  const existing = await db.execute({ sql: 'SELECT 1 FROM bookmarks WHERE post_id=? AND user_id=?', args: [postId, req.userId!] });
  if (existing.rows[0]) {
    await db.execute({ sql: 'DELETE FROM bookmarks WHERE post_id=? AND user_id=?', args: [postId, req.userId!] });
    res.json({ success: true, bookmarked: false });
  } else {
    await db.execute({ sql: 'INSERT INTO bookmarks (post_id,user_id) VALUES (?,?)', args: [postId, req.userId!] });
    res.json({ success: true, bookmarked: true });
  }
});

router.get('/:id/comments', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT c.*,u.username,u.full_name,u.avatar_url,u.is_verified,
    (SELECT COUNT(*) FROM comments sub WHERE sub.parent_id=c.id) as reply_count
    FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT 50`, args: [req.params.id] });
  res.json({ success: true, comments: r.rows });
});

router.post('/:id/comments', authenticate, async (req: AuthRequest, res) => {
  const { content, parent_id } = req.body;
  if (!content?.trim()) { res.status(400).json({ success: false, message: 'Comment cannot be empty' }); return; }
  const commentId = uuidv4();
  await db.execute({ sql: 'INSERT INTO comments (id,post_id,user_id,parent_id,content) VALUES (?,?,?,?,?)', args: [commentId, req.params.id, req.userId!, parent_id ?? null, content.trim()] });
  const post = await db.execute({ sql: 'SELECT user_id FROM posts WHERE id=?', args: [req.params.id] });
  if (post.rows[0] && post.rows[0].user_id !== req.userId) {
    await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), post.rows[0].user_id!, req.userId!, 'comment', commentId, 'comment'] });
  }
  const comment = await db.execute({ sql: 'SELECT c.*,u.username,u.full_name,u.avatar_url FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?', args: [commentId] });
  res.status(201).json({ success: true, comment: comment.rows[0] });
});

router.post('/:id/poll/vote', authenticate, async (req: AuthRequest, res) => {
  const { option_id } = req.body;
  const polls = await db.execute({ sql: 'SELECT * FROM polls WHERE post_id=?', args: [req.params.id] });
  const poll = polls.rows[0] as any;
  if (!poll) { res.status(404).json({ success: false, message: 'No poll on this post' }); return; }
  if ((poll.closes_at as number) < Math.floor(Date.now() / 1000)) { res.status(400).json({ success: false, message: 'Poll has closed' }); return; }
  const opt = await db.execute({ sql: 'SELECT id FROM poll_options WHERE id=? AND poll_id=?', args: [option_id, poll.id] });
  if (!opt.rows[0]) { res.status(400).json({ success: false, message: 'Invalid option' }); return; }
  await db.execute({ sql: 'INSERT OR REPLACE INTO poll_votes (poll_id,user_id,option_id) VALUES (?,?,?)', args: [poll.id, req.userId!, option_id] });
  const opts = await db.execute({ sql: 'SELECT po.*,(SELECT COUNT(*) FROM poll_votes WHERE option_id=po.id) as vote_count FROM poll_options po WHERE po.poll_id=? ORDER BY po.order_index', args: [poll.id] });
  const total = (opts.rows as any[]).reduce((s, o) => s + (o.vote_count as number), 0);
  res.json({ success: true, poll: { ...poll, options: opts.rows, total_votes: total, my_vote: option_id } });
});

export default router;
