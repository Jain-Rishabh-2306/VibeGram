import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(60),
});

const loginSchema = z.object({
  credential: z.string(),
  password: z.string(),
});

function generateTokens(userId: string, username: string) {
  const accessToken = jwt.sign({ userId, username }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, username }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email=? OR username=?', args: [data.email, data.username] });
    if (existing.rows.length > 0) { res.status(400).json({ success: false, message: 'Username or email already taken' }); return; }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const userId = uuidv4();
    await db.execute({ sql: 'INSERT INTO users (id,username,email,password_hash,full_name) VALUES (?,?,?,?,?)', args: [userId, data.username, data.email, passwordHash, data.full_name] });
    const { accessToken, refreshToken } = generateTokens(userId, data.username);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await db.execute({ sql: 'INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)', args: [uuidv4(), userId, tokenHash, expiresAt] });
    setAuthCookies(res, accessToken, refreshToken);
    const userRes = await db.execute({ sql: 'SELECT id,username,email,full_name,bio,avatar_url,is_verified,profile_mode FROM users WHERE id=?', args: [userId] });
    res.status(201).json({ success: true, user: userRes.rows[0], accessToken });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.errors[0].message }); } else next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { credential, password } = loginSchema.parse(req.body);
    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE email=? OR username=?', args: [credential, credential] });
    const user = userRes.rows[0] as any;
    if (!user) { res.status(401).json({ success: false, message: 'Invalid credentials' }); return; }
    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) { res.status(401).json({ success: false, message: 'Invalid credentials' }); return; }
    const { accessToken, refreshToken } = generateTokens(user.id as string, user.username as string);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE user_id=?', args: [user.id] });
    await db.execute({ sql: 'INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)', args: [uuidv4(), user.id, tokenHash, expiresAt] });
    setAuthCookies(res, accessToken, refreshToken);
    const { password_hash: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, accessToken });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, message: err.errors[0].message }); } else next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) { res.status(401).json({ success: false, message: 'No refresh token' }); return; }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string; username: string };
    const storedRes = await db.execute({ sql: 'SELECT * FROM refresh_tokens WHERE user_id=? AND expires_at > ?', args: [decoded.userId, Math.floor(Date.now() / 1000)] });
    let valid = false;
    for (const stored of storedRes.rows) {
      if (await bcrypt.compare(token, stored.token_hash as string)) { valid = true; break; }
    }
    if (!valid) { res.status(401).json({ success: false, message: 'Invalid refresh token' }); return; }
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId, decoded.username);
    const tokenHash = await bcrypt.hash(newRefresh, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE user_id=?', args: [decoded.userId] });
    await db.execute({ sql: 'INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)', args: [uuidv4(), decoded.userId, tokenHash, expiresAt] });
    setAuthCookies(res, accessToken, newRefresh);
    res.json({ success: true, accessToken });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE user_id=?', args: [req.userId!] });
  res.clearCookie('accessToken'); res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const result = await db.execute({ sql: 'SELECT id,username,email,full_name,bio,avatar_url,website,is_private,is_verified,profile_mode,created_at FROM users WHERE id=?', args: [req.userId!] });
  if (!result.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, user: result.rows[0] });
});

export default router;
