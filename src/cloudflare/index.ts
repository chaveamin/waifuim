import { Hono } from "hono";
import { cors } from "hono/cors";
import { Bot, webhookCallback } from "grammy";

declare global {
  var BOT_TOKEN: string;
  var ADMIN_TELEGRAM_ID: string;
  var WAIFU_API_KEY: string;
  var NSFW_ALLOWED: string;
}

const app = new Hono<{ Bindings: any }>();

app.use("/*", cors());

app.get("/", (c) => c.text("Waifu.im Telegram Bot is running!"));
app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/setup", async (c) => {
  const token = c.env.BOT_TOKEN;
  const url = new URL(c.req.url);
  const webhookUrl = `${url.origin}/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: [
        "message",
        "callback_query",
        "inline_query",
        "channel_post",
      ],
    }),
  });

  const data = await res.json();
  return c.json(data);
});

app.get("/init-db", async (c) => {
  const db = c.env.DB;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
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
      send_mode TEXT DEFAULT 'photo',
      daily_subscribed INTEGER DEFAULT 0,
      daily_hour INTEGER DEFAULT 9,
      daily_minute INTEGER DEFAULT 0,
      last_daily_sent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS commands_used (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      command TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, image_id)
    )`,
    `CREATE TABLE IF NOT EXISTS broadcast_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS album_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      UNIQUE(album_id, image_id)
    )`,
  ];

  try {
    for (const sql of stmts) {
      await db.prepare(sql).run();
    }
    try {
      await db
        .prepare(`ALTER TABLE users ADD COLUMN send_mode TEXT DEFAULT 'photo'`)
        .run();
    } catch (e) {
      console.log("Column send_mode likely already exists.");
    }
    return c.json({
      status: "ok",
      message: "Database initialized and migrated",
    });
  } catch (err) {
    return c.json({ status: "error", message: String(err) }, 500);
  }
});

app.all("/webhook", async (c) => {
  const env = c.env;

  globalThis.__DB = env.DB;
  globalThis.BOT_TOKEN = env.BOT_TOKEN;
  globalThis.ADMIN_TELEGRAM_ID = env.ADMIN_TELEGRAM_ID ?? "";
  globalThis.WAIFU_API_KEY = env.WAIFU_API_KEY ?? "";
  globalThis.NSFW_ALLOWED = env.NSFW_ALLOWED ?? "false";

  const bot = new Bot(env.BOT_TOKEN);

  const { authMiddleware } = await import("../bot/middleware/auth.js");
  const { registerStart } = await import("../bot/commands/start.js");
  const { registerHelp } = await import("../bot/commands/help.js");
  const { registerRandom } = await import("../bot/commands/random.js");
  const { registerSearch } = await import("../bot/commands/search.js");
  const { registerTags } = await import("../bot/commands/tags.js");
  const { registerArtists } = await import("../bot/commands/artists.js");
  const { registerImage } = await import("../bot/commands/image.js");
  const { registerStats } = await import("../bot/commands/stats.js");
  const { registerSettings } = await import("../bot/commands/settings.js");
  const { registerFavorites } = await import("../bot/commands/favorites.js");
  const { registerProfile } = await import("../bot/commands/profile.js");
  const { registerGroup } = await import("../bot/commands/group.js");
  const { registerDaily } = await import("../bot/commands/daily.js");
  const { registerAlbums } = await import("../bot/commands/albums.js");
  const { registerLeaderboard } =
    await import("../bot/commands/leaderboard.js");
  const { registerCallbackHandlers } =
    await import("../bot/handlers/callback.js");
  const { registerInlineMode } = await import("../bot/handlers/inline.js");
  const { registerCancelHandler } = await import("../bot/handlers/cancel.js");
  const { registerAdminPanel } = await import("../bot/admin/panel.js");
  const { registerAdminUsers } = await import("../bot/admin/users.js");
  const { registerAdminBroadcast } = await import("../bot/admin/broadcast.js");
  const { registerAdminStats } = await import("../bot/admin/statistics.js");

  bot.use(authMiddleware);

  bot.on("channel_post", async (ctx) => {
    const channelPost = ctx.channelPost;
    if (!channelPost) return;

    const chat = ctx.chat;
    const chatId = chat?.id;
    const messageId = channelPost.message_id;
    const fileName = channelPost.document?.file_name;
    const textPreview = channelPost.text?.slice(0, 120);
    const adminId = Number(env.ADMIN_TELEGRAM_ID || 0);

    const message =
      `Channel post received:\n` +
      `chat_id=${chatId}\n` +
      `message_id=${messageId}\n` +
      `${fileName ? `document=${fileName}\n` : ""}` +
      `${textPreview ? `text=${textPreview}\n` : ""}`;

    if (adminId) {
      try {
        await bot.api.sendMessage(adminId, message);
      } catch (err) {
        console.error("Failed to notify admin about channel post:", err);
      }
    }
  });

  registerStart(bot);
  registerHelp(bot);
  registerRandom(bot);
  registerSearch(bot);
  registerTags(bot);
  registerArtists(bot);
  registerImage(bot);
  registerStats(bot);
  registerSettings(bot);
  registerFavorites(bot);
  registerProfile(bot);
  registerGroup(bot);
  registerDaily(bot);
  registerAlbums(bot);
  registerLeaderboard(bot);

  registerAdminPanel(bot);
  registerAdminUsers(bot);
  registerAdminBroadcast(bot);
  registerAdminStats(bot);

  registerCallbackHandlers(bot);
  registerInlineMode(bot);
  registerCancelHandler(bot);

  return webhookCallback(bot, "hono")(c);
});

export default app;
