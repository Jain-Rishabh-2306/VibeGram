import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Create time capsule post
router.post('/', authenticate, upload.array('media', 10), (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      caption: z.string().max(2200).optional().default(''),
      publish_at: z.coerce.number().min(Math.floor(Date.now() / 1000) + 3600), // at least 1h in future
      visibility: z.enum(['personal', 'professional', 'both']).optional().default('both'),
    });
    const data = schema.parse(req.body);
    const files = req.files as Express.Multer.File[];

    const postId = uuidv4();
    db.prepare(`
      INSERT INTO posts (id,user_id,caption,visibility,is_time_capsule,publish_at,is_published)
      VALUES (?,?,?,?,1,?,0)
    `).run(postId, req.userId!, data.caption, data.visibility, data.publish_at);

    if (files?.length) {
      files.forEach((file, idx) => {
        db.prepare('INSERT INTO post_media (id,post_id,media_url,order_index) VALUES (?,?,?,?)').run(
          uuidv4(), postId, `/uploads/${file.filename}`, idx
        );
      });
    }

    const capsule = db.prepare('SELECT * FROM posts WHERE id=?').get(postId);
    res.status(201).json({ success: true, capsule });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message });
    else next(err);
  }
});

// Get my time capsules
router.get('/mine', authenticate, (req: AuthRequest, res) => {
  const capsules = db.prepare(`
    SELECT p.*, (SELECT media_url FROM post_media WHERE post_id=p.id ORDER BY order_index LIMIT 1) as thumbnail
    FROM posts p WHERE p.user_id=? AND p.is_time_capsule=1 ORDER BY p.publish_at ASC
  `).all(req.userId);
  res.json({ success: true, capsules });
});

// Publish due time capsules (called periodically by server)
export function publishDueCapsules() {
  const now = Math.floor(Date.now() / 1000);
  const due = db.prepare("SELECT id, user_id FROM posts WHERE is_time_capsule=1 AND is_published=0 AND publish_at <= ?").all(now) as any[];
  for (const capsule of due) {
    db.prepare('UPDATE posts SET is_published=1 WHERE id=?').run(capsule.id);
    db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
      uuidv4(), capsule.user_id, capsule.user_id, 'capsule_published', capsule.id, 'post'
    );
  }
}

// Delete capsule
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  const capsule = db.prepare('SELECT user_id FROM posts WHERE id=? AND is_time_capsule=1').get(req.params.id) as any;
  if (!capsule || capsule.user_id !== req.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
