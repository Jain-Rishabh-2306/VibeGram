import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export function initSocket(httpServer: HttpServer, clientUrl: string) {
  const io = new SocketServer(httpServer, {
    cors: { origin: clientUrl, credentials: true },
    transports: ['websocket', 'polling'],
  });

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
    socket.join(`user:${userId}`);

    socket.on('join_conversation', async (conversationId: string) => {
      const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [conversationId, userId] });
      if (p.rows[0]) socket.join(`conv:${conversationId}`);
    });

    socket.on('send_message', async (data: { conversation_id: string; content: string; message_type?: string; metadata?: any }) => {
      const { conversation_id, content, message_type = 'text', metadata } = data;
      if (!content?.trim()) return;
      const p = await db.execute({ sql: 'SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?', args: [conversation_id, userId] });
      if (!p.rows[0]) return;
      const msgId = uuidv4();
      await db.execute({ sql: 'INSERT INTO messages (id,conversation_id,sender_id,content,message_type,metadata) VALUES (?,?,?,?,?,?)', args: [msgId, conversation_id, userId, content.trim(), message_type, metadata ? JSON.stringify(metadata) : null] });
      const msg = await db.execute({ sql: 'SELECT m.*,u.username,u.full_name,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?', args: [msgId] });
      io.to(`conv:${conversation_id}`).emit('new_message', msg.rows[0]);
    });

    socket.on('typing', (conversationId: string) => { socket.to(`conv:${conversationId}`).emit('user_typing', { user_id: userId, username: (socket as any).username }); });
    socket.on('stop_typing', (conversationId: string) => { socket.to(`conv:${conversationId}`).emit('user_stop_typing', { user_id: userId }); });
    socket.on('ping', () => socket.emit('pong'));
  });

  return io;
}
