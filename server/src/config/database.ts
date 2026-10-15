import { createClient, Client } from '@libsql/client';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const DB_PATH = process.env.DB_PATH || './database.db';
const url = process.env.TURSO_DATABASE_URL || `file:${path.resolve(DB_PATH)}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db: Client = createClient({
  url,
  authToken,
});

export async function initializeDatabase(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, full_name TEXT NOT NULL, bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '', website TEXT DEFAULT '', is_private INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      profile_mode TEXT DEFAULT 'personal' CHECK(profile_mode IN ('personal','professional')),
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()))`,

    `CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL, following_id TEXT NOT NULL,
      status TEXT DEFAULT 'accepted' CHECK(status IN ('pending','accepted')),
      contact_type TEXT DEFAULT 'personal' CHECK(contact_type IN ('personal','professional')),
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, caption TEXT DEFAULT '',
      location TEXT DEFAULT '',
      visibility TEXT DEFAULT 'both' CHECK(visibility IN ('personal','professional','both')),
      sensitivity_label TEXT DEFAULT NULL CHECK(sensitivity_label IN ('spoiler','sensitive','satire', NULL)),
      is_time_capsule INTEGER DEFAULT 0, publish_at INTEGER DEFAULT NULL,
      is_published INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS post_media (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL, media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image' CHECK(media_type IN ('image','gif')),
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS post_links (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL, url TEXT NOT NULL,
      display_text TEXT NOT NULL, created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS hashtags (id TEXT PRIMARY KEY, tag TEXT UNIQUE NOT NULL)`,

    `CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id TEXT NOT NULL, hashtag_id TEXT NOT NULL,
      PRIMARY KEY (post_id, hashtag_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL, post_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL, content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL, post_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image', caption TEXT DEFAULT '',
      expires_at INTEGER NOT NULL, created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS story_views (
      story_id TEXT NOT NULL, viewer_id TEXT NOT NULL,
      viewed_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (story_id, viewer_id),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL, actor_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('like','comment','follow','mention','poll_vote','event_rsvp','album_invite','capsule_published')),
      entity_id TEXT, entity_type TEXT, is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'direct' CHECK(type IN ('direct','event_group')),
      event_id TEXT DEFAULT NULL, created_at INTEGER DEFAULT (unixepoch()))`,

    `CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL, user_id TEXT NOT NULL,
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text','image','link','location','system')),
      metadata TEXT DEFAULT NULL, created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, title TEXT NOT NULL,
      location_name TEXT NOT NULL, event_date INTEGER NOT NULL, description TEXT DEFAULT '',
      max_attendees INTEGER DEFAULT NULL, conversation_id TEXT DEFAULT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL, user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going' CHECK(status IN ('going','maybe','not_going')),
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '', creator_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS album_members (
      album_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT DEFAULT 'contributor' CHECK(role IN ('owner','contributor')),
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (album_id, user_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS album_media (
      id TEXT PRIMARY KEY, album_id TEXT NOT NULL, uploaded_by TEXT NOT NULL,
      media_url TEXT NOT NULL, caption TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL, question TEXT NOT NULL,
      closes_at INTEGER NOT NULL, created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY, poll_id TEXT NOT NULL, option_text TEXT NOT NULL,
      option_image_url TEXT DEFAULT '', order_index INTEGER DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL, user_id TEXT NOT NULL, option_id TEXT NOT NULL,
      voted_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (poll_id, user_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL, created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

    `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, expires_at)`,
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
  console.log('✅ Database initialized');
}

export default db;
