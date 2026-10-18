import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

import { initializeDatabase } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { initSocket } from './socket/chatSocket';
import { publishDueCapsules } from './routes/capsules';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import feedRoutes from './routes/feed';
import storyRoutes from './routes/stories';
import notificationRoutes from './routes/notifications';
import messageRoutes from './routes/messages';
import eventRoutes from './routes/events';
import albumRoutes from './routes/albums';
import capsuleRoutes from './routes/capsules';
import exploreRoutes from './routes/explore';

// Initialize database safely (do not block serverless cold start)
initializeDatabase().catch((err) => {
  console.warn('Database initialization note:', err?.message || err);
});

const app = express();
const httpServer = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = parseInt(process.env.PORT || '5000');

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many requests, slow down.' } });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Root & Health check
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'VibeGram API',
    message: 'Backend is running smoothly 🚀',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      posts: '/api/posts',
    },
    timestamp: Date.now(),
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Static uploads (fallback)
const staticUploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve('./uploads');
app.use('/uploads', express.static(staticUploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/capsules', capsuleRoutes);
app.use('/api/explore', exploreRoutes);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.io (if running as standalone server)
if (!process.env.VERCEL) {
  initSocket(httpServer, CLIENT_URL);

  // Time capsule publisher — check every minute
  setInterval(() => {
    try { publishDueCapsules(); } catch (e) { console.error('Capsule check error:', e); }
  }, 60_000);

  httpServer.listen(PORT, () => {
    console.log(`🚀 VibeGram API running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready`);
  });
}

module.exports = app;
export default app;
