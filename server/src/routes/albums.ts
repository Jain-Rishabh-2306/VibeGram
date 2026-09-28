import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({ title: z.string().min(1).max(100), description: z.string().max(300).optional().default('') }).parse(req.body);
    const albumId = uuidv4();
    await db.execute({ sql: 'INSERT INTO albums (id,title,description,creator_id) VALUES (?,?,?,?)', args: [albumId, data.title, data.description, req.userId!] });
    await db.execute({ sql: "INSERT INTO album_members (album_id,user_id,role) VALUES (?,?,'owner')", args: [albumId, req.userId!] });
    const album = await db.execute({ sql: 'SELECT * FROM albums WHERE id=?', args: [albumId] });
    res.status(201).json({ success: true, album: album.rows[0] });
  } catch (err) { if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message }); else next(err); }
});

router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  const r = await db.execute({ sql: `SELECT a.*,am.role,(SELECT COUNT(*) FROM album_media WHERE album_id=a.id) as media_count,(SELECT COUNT(*) FROM album_members WHERE album_id=a.id) as member_count FROM albums a JOIN album_members am ON am.album_id=a.id AND am.user_id=? ORDER BY a.created_at DESC`, args: [req.userId!] });
  res.json({ success: true, albums: r.rows });
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const m = await db.execute({ sql: 'SELECT role FROM album_members WHERE album_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!m.rows[0]) { res.status(403).json({ success: false, message: 'Not a member' }); return; }
  const albumRes = await db.execute({ sql: 'SELECT * FROM albums WHERE id=?', args: [req.params.id] });
  if (!albumRes.rows[0]) { res.status(404).json({ success: false, message: 'Album not found' }); return; }
  const album = albumRes.rows[0] as any;
  const media = await db.execute({ sql: 'SELECT am.*,u.username,u.full_name,u.avatar_url FROM album_media am JOIN users u ON u.id=am.uploaded_by WHERE am.album_id=? ORDER BY am.created_at DESC', args: [req.params.id] });
  album.media = media.rows;
  const members = await db.execute({ sql: 'SELECT u.id,u.username,u.full_name,u.avatar_url,amem.role FROM album_members amem JOIN users u ON u.id=amem.user_id WHERE amem.album_id=?', args: [req.params.id] });
  album.members = members.rows;
  res.json({ success: true, album });
});

router.post('/:id/invite', authenticate, async (req: AuthRequest, res) => {
  const { user_id } = req.body;
  const myRole = await db.execute({ sql: 'SELECT role FROM album_members WHERE album_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!myRole.rows[0]) { res.status(403).json({ success: false, message: 'Not a member' }); return; }
  await db.execute({ sql: "INSERT OR IGNORE INTO album_members (album_id,user_id,role) VALUES (?,?,'contributor')", args: [req.params.id, user_id] });
  await db.execute({ sql: 'INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)', args: [uuidv4(), user_id, req.userId!, 'album_invite', req.params.id, 'album'] });
  res.json({ success: true });
});

router.post('/:id/media', authenticate, upload.single('media'), async (req: AuthRequest, res) => {
  const m = await db.execute({ sql: 'SELECT role FROM album_members WHERE album_id=? AND user_id=?', args: [req.params.id, req.userId!] });
  if (!m.rows[0]) { res.status(403).json({ success: false, message: 'Not a member' }); return; }
  if (!req.file) { res.status(400).json({ success: false, message: 'Media file required' }); return; }
  const mediaId = uuidv4();
  await db.execute({ sql: 'INSERT INTO album_media (id,album_id,uploaded_by,media_url,caption) VALUES (?,?,?,?,?)', args: [mediaId, req.params.id, req.userId!, `/uploads/${req.file.filename}`, req.body.caption || ''] });
  const media = await db.execute({ sql: 'SELECT am.*,u.username,u.full_name,u.avatar_url FROM album_media am JOIN users u ON u.id=am.uploaded_by WHERE am.id=?', args: [mediaId] });
  res.status(201).json({ success: true, media: media.rows[0] });
});

export default router;
