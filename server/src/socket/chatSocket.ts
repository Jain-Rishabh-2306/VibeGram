import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export function initSocket(httpServer: HttpServer, clientUrl: string) {
  const io = new SocketServer(httpServer, {
    cors: { origin: clientUrl, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) { next(new Error('Unauthorized')); return; }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string; username: string };
      (socket as any).userId = decoded.userId;
      (socket as any).username = decoded.username;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    socket.join(`user:${userId}`); // personal room

    // Join a conversation room
    socket.on('join_conversation', (conversationId: string) => {
      const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(conversationId, userId);
      if (participant) socket.join(`conv:${conversationId}`);
    });

    // Send message via socket
    socket.on('send_message', (data: { conversation_id: string; content: string; message_type?: string; metadata?: any }) => {
      const { conversation_id, content, message_type = 'text', metadata } = data;
      const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(conversation_id, userId);
      if (!participant || !content?.trim()) return;

      const msgId = uuidv4();
      db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content,message_type,metadata) VALUES (?,?,?,?,?,?)').run(
        msgId, conversation_id, userId, content.trim(), message_type, metadata ? JSON.stringify(metadata) : null
      );
      const message = db.prepare(`
        SELECT m.*, u.username, u.full_name, u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?
      `).get(msgId);

      io.to(`conv:${conversation_id}`).emit('new_message', message);
    });

    // Typing indicator
    socket.on('typing', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', { user_id: userId, username: (socket as any).username });
    });
    socket.on('stop_typing', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', { user_id: userId });
    });

    // Real-time notification delivery
    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', () => {
      // Cleanup if needed
    });
  });

  return io;
}
