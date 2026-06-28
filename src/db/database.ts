import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let db: Database;

function loadDb(): Promise<Database> {
  return initSqlJs().then((SQL) => {
    if (existsSync(config.dbPath)) {
      const buffer = readFileSync(config.dbPath);
      return new SQL.Database(buffer);
    }
    return new SQL.Database();
  });
}

function saveDb() {
  if (db) {
    const data = db.export();
    writeFileSync(config.dbPath, Buffer.from(data));
  }
}

export async function initDb(): Promise<void> {
  db = await loadDb();
  initSchema();
  setInterval(saveDb, 5000);
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

function initSchema() {
  db.run(`
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
      send_mode TEXT DEFAULT 'photo',
      daily_hour INTEGER DEFAULT 9,
      daily_minute INTEGER DEFAULT 0,
      last_daily_sent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    )
  `);

  const colResult = db.exec("PRAGMA table_info(users)");
  const colNames = colResult.length
    ? colResult[0].values.map((r: any[]) => String(r[1]))
    : [];
  if (!colNames.includes("image_count"))
    db.run("ALTER TABLE users ADD COLUMN image_count INTEGER DEFAULT 1");
  if (!colNames.includes("orientation"))
    db.run("ALTER TABLE users ADD COLUMN orientation TEXT DEFAULT 'any'");
  if (!colNames.includes("animation_mode"))
    db.run("ALTER TABLE users ADD COLUMN animation_mode TEXT DEFAULT 'any'");
  if (!colNames.includes("language"))
    db.run("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'");
  if (!colNames.includes("send_mode"))
    db.run("ALTER TABLE users ADD COLUMN send_mode TEXT DEFAULT 'photo'");
  if (!colNames.includes("daily_subscribed"))
    db.run("ALTER TABLE users ADD COLUMN daily_subscribed INTEGER DEFAULT 0");
  if (!colNames.includes("daily_hour"))
    db.run("ALTER TABLE users ADD COLUMN daily_hour INTEGER DEFAULT 9");
  if (!colNames.includes("daily_minute"))
    db.run("ALTER TABLE users ADD COLUMN daily_minute INTEGER DEFAULT 0");
  if (!colNames.includes("last_daily_sent"))
    db.run("ALTER TABLE users ADD COLUMN last_daily_sent TEXT");
  if (colNames.includes("nsfw_enabled") && !colNames.includes("nsfw_mode")) {
    db.run("ALTER TABLE users ADD COLUMN nsfw_mode TEXT DEFAULT 'sfw'");
    db.run("UPDATE users SET nsfw_mode = 'nsfw' WHERE nsfw_enabled = 1");
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS commands_used (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      command TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(telegram_id),
      UNIQUE(user_id, image_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS broadcast_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS album_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      UNIQUE(album_id, image_id)
    )
  `);
  saveDb();
}

export { saveDb };
