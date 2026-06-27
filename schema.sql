
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_banned INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  nsfw_mode TEXT DEFAULT 'sfw',
  image_count INTEGER DEFAULT 1,
  orientation TEXT DEFAULT 'any',
  animation_mode TEXT DEFAULT 'any',
  language TEXT DEFAULT 'en',
  daily_subscribed INTEGER DEFAULT 0,
  daily_hour INTEGER DEFAULT 9,
  daily_minute INTEGER DEFAULT 0,
  last_daily_sent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commands_used (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  command TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  image_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, image_id)
);

CREATE TABLE IF NOT EXISTS broadcast_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  share_token TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS album_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER NOT NULL,
  image_id INTEGER NOT NULL,
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(album_id, image_id)
);
