import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Create album
router.post('/', authenticate, (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({ title: z.string().min(1).max(100), description: z.string().max(300).optional().default('') });
    const data = schema.parse(req.body);
    const albumId = uuidv4();
    db.prepare('INSERT INTO albums (id,title,description,creator_id) VALUES (?,?,?,?)').run(albumId, data.title, data.description, req.userId);
    db.prepare("INSERT INTO album_members (album_id,user_id,role) VALUES (?,?,'owner')").run(albumId, req.userId);
    const album = db.prepare('SELECT * FROM albums WHERE id=?').get(albumId);
    res.status(201).json({ success: true, album });
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ success: false, message: err.errors[0].message });
    else next(err);
  }
});

// Get my albums
router.get('/mine', authenticate, (req: AuthRequest, res) => {
  const albums = db.prepare(`
    SELECT a.*, am.role,
      (SELECT COUNT(*) FROM album_media WHERE album_id=a.id) as media_count,
      (SELECT COUNT(*) FROM album_members WHERE album_id=a.id) as member_count,
      (SELECT media_url FROM album_media WHERE album_id=a.id ORDER BY created_at DESC LIMIT 1) as cover_url
    FROM albums a JOIN album_members am ON am.album_id=a.id AND am.user_id=?
    ORDER BY a.created_at DESC
  `).all(req.userId);
  res.json({ success: true, albums });
});

// Get album detail
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  const member = db.prepare('SELECT role FROM album_members WHERE album_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!member) { res.status(403).json({ success: false, message: 'Not a member of this album' }); return; }
  const album = db.prepare('SELECT * FROM albums WHERE id=?').get(req.params.id) as any;
  if (!album) { res.status(404).json({ success: false, message: 'Album not found' }); return; }
  album.media = db.prepare(`
    SELECT am.*, u.username, u.full_name, u.avatar_url
    FROM album_media am JOIN users u ON u.id=am.uploaded_by WHERE am.album_id=? ORDER BY am.created_at DESC
  `).all(req.params.id);
  album.members = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url, amem.role
    FROM album_members amem JOIN users u ON u.id=amem.user_id WHERE amem.album_id=?
  `).all(req.params.id);
  res.json({ success: true, album });
});

// Invite user to album
router.post('/:id/invite', authenticate, (req: AuthRequest, res) => {
  const { user_id } = req.body;
  const myRole = db.prepare('SELECT role FROM album_members WHERE album_id=? AND user_id=?').get(req.params.id, req.userId) as any;
  if (!myRole) { res.status(403).json({ success: false, message: 'Not a member' }); return; }
  db.prepare("INSERT OR IGNORE INTO album_members (album_id,user_id,role) VALUES (?,?,'contributor')").run(req.params.id, user_id);
  db.prepare('INSERT INTO notifications (id,recipient_id,actor_id,type,entity_id,entity_type) VALUES (?,?,?,?,?,?)').run(
    uuidv4(), user_id, req.userId, 'album_invite', req.params.id, 'album'
  );
  res.json({ success: true });
});

// Upload media to album
router.post('/:id/media', authenticate, upload.single('media'), (req: AuthRequest, res) => {
  const member = db.prepare('SELECT role FROM album_members WHERE album_id=? AND user_id=?').get(req.params.id, req.userId);
  if (!member) { res.status(403).json({ success: false, message: 'Not a member' }); return; }
  if (!req.file) { res.status(400).json({ success: false, message: 'Media file required' }); return; }
  const { caption } = req.body;
  const mediaId = uuidv4();
  db.prepare('INSERT INTO album_media (id,album_id,uploaded_by,media_url,caption) VALUES (?,?,?,?,?)').run(
    mediaId, req.params.id, req.userId, `/uploads/${req.file.filename}`, caption || ''
  );
  const media = db.prepare(`
    SELECT am.*, u.username, u.full_name, u.avatar_url
    FROM album_media am JOIN users u ON u.id=am.uploaded_by WHERE am.id=?
  `).get(mediaId);
  res.status(201).json({ success: true, media });
});

export default router;
