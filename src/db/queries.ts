import { getDb, saveDb } from "./database.js";

export type DbUser = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_banned: number;
  is_admin: number;
  nsfw_mode: string;
  image_count: number;
  orientation: string;
  animation_mode: string;
  language: string;
  daily_subscribed: number;
  daily_hour: number;
  daily_minute: number;
  last_daily_sent: string | null;
  created_at: string;
  last_active: string;
};

function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql: string, params: any[] = []): any | undefined {
  const rows = queryAll(sql, params);
  return rows[0];
}

function runSql(sql: string, params: any[] = []): void {
  const db = getDb();
  db.run(sql, params);
  saveDb();
}

export async function upsertUser(telegramId: number, username: string | null, firstName: string | null, lastName: string | null): Promise<void> {
  const existing = queryOne("SELECT telegram_id FROM users WHERE telegram_id = ?", [telegramId]);
  if (existing) {
    runSql("UPDATE users SET username = ?, first_name = ?, last_name = ?, last_active = datetime('now') WHERE telegram_id = ?", [username, firstName, lastName, telegramId]);
  } else {
    const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
    const isAdmin = telegramId === adminId ? 1 : 0;
    runSql("INSERT INTO users (telegram_id, username, first_name, last_name, is_admin) VALUES (?, ?, ?, ?, ?)", [telegramId, username, firstName, lastName, isAdmin]);
  }
}

export async function getUser(telegramId: number): Promise<DbUser | undefined> {
  return queryOne("SELECT * FROM users WHERE telegram_id = ?", [telegramId]);
}

export async function isUserBanned(telegramId: number): Promise<boolean> {
  const user = await getUser(telegramId);
  return user?.is_banned === 1;
}

export async function isUserAdmin(telegramId: number): Promise<boolean> {
  const user = await getUser(telegramId);
  return user?.is_admin === 1;
}

export async function setBanned(telegramId: number, banned: boolean): Promise<void> {
  runSql("UPDATE users SET is_banned = ? WHERE telegram_id = ?", [banned ? 1 : 0, telegramId]);
}

export async function setNsfwMode(telegramId: number, mode: string): Promise<void> {
  runSql("UPDATE users SET nsfw_mode = ? WHERE telegram_id = ?", [mode, telegramId]);
}

export async function setLanguage(telegramId: number, lang: string): Promise<void> {
  runSql("UPDATE users SET language = ? WHERE telegram_id = ?", [lang, telegramId]);
}

export async function updateActivity(telegramId: number): Promise<void> {
  runSql("UPDATE users SET last_active = datetime('now') WHERE telegram_id = ?", [telegramId]);
}

export async function logCommand(telegramId: number, command: string): Promise<void> {
  runSql("INSERT INTO commands_used (user_id, command) VALUES (?, ?)", [telegramId, command]);
}

export async function getAllUsers(): Promise<DbUser[]> {
  return queryAll("SELECT * FROM users ORDER BY created_at DESC");
}

export async function getAllNonBannedUsers(): Promise<DbUser[]> {
  return queryAll("SELECT * FROM users WHERE is_banned = 0 ORDER BY created_at DESC");
}

export async function getUserCount(): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM users");
  return (row?.count as number) ?? 0;
}

export async function getActiveUserCount(days: number): Promise<number> {
  const row = queryOne(
    `SELECT COUNT(*) as count FROM users WHERE last_active >= datetime('now', '-' || ? || ' days')`,
    [days]
  );
  return (row?.count as number) ?? 0;
}

export async function getTopCommands(limit: number = 10): Promise<{ command: string; count: number }[]> {
  return queryAll(
    "SELECT command, COUNT(*) as count FROM commands_used GROUP BY command ORDER BY count DESC LIMIT ?",
    [limit]
  );
}

export async function getUserCommandCount(telegramId: number): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM commands_used WHERE user_id = ?", [telegramId]);
  return (row?.count as number) ?? 0;
}

export async function logBroadcast(adminId: number, message: string, recipientCount: number): Promise<void> {
  runSql(
    "INSERT INTO broadcast_log (admin_id, message, recipient_count) VALUES (?, ?, ?)",
    [adminId, message, recipientCount]
  );
}

export async function searchUsers(query: string): Promise<DbUser[]> {
  return queryAll(
    "SELECT * FROM users WHERE username LIKE ? OR first_name LIKE ? OR CAST(telegram_id AS TEXT) LIKE ? ORDER BY created_at DESC LIMIT 20",
    [`%${query}%`, `%${query}%`, `%${query}%`]
  );
}

export async function getNewUserCount(days: number): Promise<number> {
  const row = queryOne(
    `SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-' || ? || ' days')`,
    [days]
  );
  return (row?.count as number) ?? 0;
}

export async function addFavorite(telegramId: number, imageId: number): Promise<void> {
  runSql("INSERT OR IGNORE INTO favorites (user_id, image_id) VALUES (?, ?)", [telegramId, imageId]);
}

export async function removeFavorite(telegramId: number, imageId: number): Promise<void> {
  runSql("DELETE FROM favorites WHERE user_id = ? AND image_id = ?", [telegramId, imageId]);
}

export async function isFavorited(telegramId: number, imageId: number): Promise<boolean> {
  const row = queryOne("SELECT 1 FROM favorites WHERE user_id = ? AND image_id = ?", [telegramId, imageId]);
  return !!row;
}

export async function toggleFavorite(telegramId: number, imageId: number): Promise<boolean> {
  if (await isFavorited(telegramId, imageId)) {
    await removeFavorite(telegramId, imageId);
    return false;
  }
  await addFavorite(telegramId, imageId);
  return true;
}

export async function getFavoriteCount(telegramId: number): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM favorites WHERE user_id = ?", [telegramId]);
  return (row?.count as number) ?? 0;
}

export async function getUserFavorites(telegramId: number, limit: number = 20, offset: number = 0): Promise<{ image_id: number; created_at: string }[]> {
  return queryAll(
    "SELECT image_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [telegramId, limit, offset]
  );
}

export async function setImageCount(telegramId: number, count: number): Promise<void> {
  runSql("UPDATE users SET image_count = ? WHERE telegram_id = ?", [count, telegramId]);
}

export async function setOrientation(telegramId: number, orientation: string): Promise<void> {
  runSql("UPDATE users SET orientation = ? WHERE telegram_id = ?", [orientation, telegramId]);
}

export async function setAnimationMode(telegramId: number, mode: string): Promise<void> {
  runSql("UPDATE users SET animation_mode = ? WHERE telegram_id = ?", [mode, telegramId]);
}

export async function toggleDailySubscription(telegramId: number): Promise<boolean> {
  const user = await getUser(telegramId);
  const newState = user?.daily_subscribed !== 1 ? 1 : 0;
  runSql("UPDATE users SET daily_subscribed = ? WHERE telegram_id = ?", [newState, telegramId]);
  return newState === 1;
}

export async function setDailyTime(telegramId: number, hour: number, minute: number): Promise<void> {
  runSql("UPDATE users SET daily_hour = ?, daily_minute = ? WHERE telegram_id = ?", [hour, minute, telegramId]);
}

export async function markDailySent(telegramId: number): Promise<void> {
  runSql("UPDATE users SET last_daily_sent = datetime('now') WHERE telegram_id = ?", [telegramId]);
}

export async function getDailySubscribers(): Promise<DbUser[]> {
  return queryAll("SELECT * FROM users WHERE daily_subscribed = 1 AND is_banned = 0");
}

export async function createAlbum(telegramId: number, name: string, description: string = ""): Promise<number> {
  const token = require("crypto").randomBytes(8).toString("hex");
  runSql("INSERT INTO albums (user_id, name, description, share_token) VALUES (?, ?, ?, ?)", [telegramId, name, description, token]);
  const row = queryOne("SELECT last_insert_rowid() as id");
  return (row?.id as number) ?? 0;
}

export async function deleteAlbum(albumId: number): Promise<void> {
  runSql("DELETE FROM album_images WHERE album_id = ?", [albumId]);
  runSql("DELETE FROM albums WHERE id = ?", [albumId]);
}

export async function renameAlbum(albumId: number, name: string): Promise<void> {
  runSql("UPDATE albums SET name = ? WHERE id = ?", [name, albumId]);
}

export async function getAlbum(albumId: number): Promise<any> {
  return queryOne("SELECT * FROM albums WHERE id = ?", [albumId]);
}

export async function getAlbumByShareToken(token: string): Promise<any> {
  return queryOne("SELECT * FROM albums WHERE share_token = ?", [token]);
}

export async function getUserAlbums(telegramId: number): Promise<any[]> {
  return queryAll(`
    SELECT a.id, a.name, a.description, a.share_token, a.created_at,
           (SELECT COUNT(*) FROM album_images WHERE album_id = a.id) as image_count
    FROM albums a WHERE a.user_id = ? ORDER BY a.created_at DESC
  `, [telegramId]);
}

export async function addToAlbum(albumId: number, imageId: number): Promise<boolean> {
  const existing = queryOne("SELECT 1 FROM album_images WHERE album_id = ? AND image_id = ?", [albumId, imageId]);
  if (existing) return false;
  runSql("INSERT INTO album_images (album_id, image_id) VALUES (?, ?)", [albumId, imageId]);
  return true;
}

export async function removeFromAlbum(albumId: number, imageId: number): Promise<void> {
  runSql("DELETE FROM album_images WHERE album_id = ? AND image_id = ?", [albumId, imageId]);
}

export async function getAlbumImages(albumId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
  return queryAll("SELECT image_id, added_at FROM album_images WHERE album_id = ? ORDER BY added_at DESC LIMIT ? OFFSET ?", [albumId, limit, offset]);
}

export async function getAlbumImageCount(albumId: number): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM album_images WHERE album_id = ?", [albumId]);
  return (row?.count as number) ?? 0;
}

export async function isImageInAlbum(albumId: number, imageId: number): Promise<boolean> {
  const row = queryOne("SELECT 1 FROM album_images WHERE album_id = ? AND image_id = ?", [albumId, imageId]);
  return !!row;
}

export async function getUserAlbumsContainingImage(telegramId: number, imageId: number): Promise<any[]> {
  return queryAll(`
    SELECT a.id, a.name FROM albums a
    INNER JOIN album_images ai ON ai.album_id = a.id
    WHERE a.user_id = ? AND ai.image_id = ?
  `, [telegramId, imageId]);
}

export async function getMostActiveUsers(limit: number = 10): Promise<any[]> {
  return queryAll(`
    SELECT u.telegram_id, u.username, u.first_name, COUNT(c.id) as command_count
    FROM users u INNER JOIN commands_used c ON c.user_id = u.telegram_id
    WHERE u.is_banned = 0 GROUP BY u.telegram_id ORDER BY command_count DESC LIMIT ?
  `, [limit]);
}

export async function getMostFavoritedUsers(limit: number = 10): Promise<any[]> {
  return queryAll(`
    SELECT u.telegram_id, u.username, u.first_name, COUNT(f.id) as fav_count
    FROM users u INNER JOIN favorites f ON f.user_id = u.telegram_id
    WHERE u.is_banned = 0 GROUP BY u.telegram_id ORDER BY fav_count DESC LIMIT ?
  `, [limit]);
}

export async function getMostAlbumCreators(limit: number = 10): Promise<any[]> {
  return queryAll(`
    SELECT u.telegram_id, u.username, u.first_name, COUNT(a.id) as album_count
    FROM users u INNER JOIN albums a ON a.user_id = u.telegram_id
    WHERE u.is_banned = 0 GROUP BY u.telegram_id ORDER BY album_count DESC LIMIT ?
  `, [limit]);
}

export async function getAlbumsTotalCount(): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM albums");
  return (row?.count as number) ?? 0;
}

export async function getDailySubscribersCount(): Promise<number> {
  const row = queryOne("SELECT COUNT(*) as count FROM users WHERE daily_subscribed = 1 AND is_banned = 0");
  return (row?.count as number) ?? 0;
}
