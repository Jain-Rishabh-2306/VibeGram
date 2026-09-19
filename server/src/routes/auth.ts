import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
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
  const accessToken = jwt.sign(
    { userId, username },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, username },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(data.email, data.username);
    if (existing) {
      res.status(400).json({ success: false, message: 'Username or email already taken' });
      return;
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const userId = uuidv4();
    db.prepare('INSERT INTO users (id,username,email,password_hash,full_name) VALUES (?,?,?,?,?)').run(
      userId, data.username, data.email, passwordHash, data.full_name
    );
    const { accessToken, refreshToken } = generateTokens(userId, data.username);
    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    db.prepare('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)').run(
      uuidv4(), userId, tokenHash, expiresAt
    );
    setAuthCookies(res, accessToken, refreshToken);
    const user = db.prepare('SELECT id,username,email,full_name,bio,avatar_url,is_verified,profile_mode FROM users WHERE id=?').get(userId);
    res.status(201).json({ success: true, user, accessToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
    } else next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { credential, password } = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email=? OR username=?').get(credential, credential) as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const { accessToken, refreshToken } = generateTokens(user.id, user.username);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(user.id);
    db.prepare('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)').run(
      uuidv4(), user.id, tokenHash, expiresAt
    );
    setAuthCookies(res, accessToken, refreshToken);
    const { password_hash: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, accessToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
    } else next(err);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { res.status(401).json({ success: false, message: 'No refresh token' }); return; }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string; username: string };
    const storedTokens = db.prepare('SELECT * FROM refresh_tokens WHERE user_id=? AND expires_at > ?').all(
      decoded.userId, Math.floor(Date.now() / 1000)
    ) as any[];
    let valid = false;
    for (const stored of storedTokens) {
      if (await bcrypt.compare(token, stored.token_hash)) { valid = true; break; }
    }
    if (!valid) { res.status(401).json({ success: false, message: 'Invalid refresh token' }); return; }
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId, decoded.username);
    const tokenHash = await bcrypt.hash(newRefresh, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(decoded.userId);
    db.prepare('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)').run(
      uuidv4(), decoded.userId, tokenHash, expiresAt
    );
    setAuthCookies(res, accessToken, newRefresh);
    res.json({ success: true, accessToken });
  } catch (err) { next(err); }
});

// Logout
router.post('/logout', authenticate, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(req.userId);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
});

// Get current user
router.get('/me', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id,username,email,full_name,bio,avatar_url,website,is_private,is_verified,profile_mode,created_at FROM users WHERE id=?').get(req.userId);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, user });
});

export default router;
