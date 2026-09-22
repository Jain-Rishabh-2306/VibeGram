import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', authenticate, upload.array('media', 10), async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({ caption: z.string().max(2200).optional().default(''), publish_at: z.coerce.number().min(Math.floor(Date.now() / 1000) + 3600), visibility: z.enum(['personal','professional','both']).optional().default('both') }).parse(req.body);
    const files = req.files as Express.Multer.File[];
    const postId = uuidv4();
    await db.execute({ sql: 'INSERT INTO posts (id,user_id,caption,visibility,is_time_capsule,publish_at,is_published) VALUES (?,?,?,?,1,?,0)', args: [postId, req.userId!, data.caption, data.visibility, data.publish_at] });
    if (files?.length) {
      for (let i = 0; i < files.length; i++) { await db.execute({ sql: 'INSERT INTO post_media (id,post_id,media_url,order_index) VALUES (?,?,?,?)', args: [uuidv4(), postId, `/uploads/${files[i].filename}`, i] }); }
    }
    const capsule = await db.execute({ sql: 'SELECT * FROM posts WHERE id=?', args: [postId] });
    res.status(201).json({ success: true, capsule: capsule.rows[0] });
  } catch (err) { if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message }); else next(err); }
});

router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT p.*,(SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail FROM posts p WHERE p.user_id=? AND p.is_time_capsule=1 ORDER BY p.publish_at ASC`, args: [req.userId!] });
  res.json({ success: true, capsules: r.rows });
});

export async function publishDueCapsules() {
  const now = Math.floor(Date.now() / 1000);
  const due = await db.execute({ sql: "SELECT id,user_id FROM posts WHERE is_time_capsule=1 AND is_published=0 AND publish_at <= ?", args: [now] });
  for (const capsule of due.rows) {
    await db.execute({ sql: 'UPDATE posts SET is_published=1 WHERE id=?', args: [(capsule as any).id] });
    await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), (capsule as any).user_id, (capsule as any).user_id, 'capsule_published', (capsule as any).id, 'post'] });
  }
}

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: 'SELECT user_id FROM posts WHERE id=? AND is_time_capsule=1', args: [req.params.id] });
  if (!r.rows[0] || r.rows[0].user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  await db.execute({ sql: 'DELETE FROM posts WHERE id=?', args: [req.params.id] });
  res.json({ success: true });
});

export default router;
