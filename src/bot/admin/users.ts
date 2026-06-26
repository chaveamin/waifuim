import { Context, NextFunction } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getAllUsers,
  getUser,
  setBanned,
  searchUsers,
  getUserCommandCount,
  isUserAdmin,
} from "../../db/queries.js";
import { paginateArray, formatDate, truncate } from "../../utils/formatters.js";
import { tr } from "../../i18n/index.js";

const USERS_PER_PAGE = 8;

export function registerAdminUsers(bot: any) {
  bot.callbackQuery("admin:users", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const users = await getAllUsers();
    showUsersList(ctx, users, 1);
  });

  bot.callbackQuery(/^admin_users_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const users = await getAllUsers();
    showUsersList(ctx, users, page);
  });

  bot.callbackQuery(/^admin_user:(\d+)$/, async (ctx: Context) => {
    const telegramId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await showUserDetail(ctx, telegramId);
  });

  bot.callbackQuery(/^admin_ban:(\d+)$/, async (ctx: Context) => {
    const telegramId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply("User not found.", {
        reply_markup: new InlineKeyboard().text(
          `🏠 ${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
      return;
    }
    const newBannedState = user.is_banned !== 1;
    await setBanned(telegramId, newBannedState);
    await ctx.reply(
      `${newBannedState ? "🚫" : "✅"} User ${user.username ?? user.first_name ?? telegramId} has been ${newBannedState ? "banned" : "unbanned"}.`,
    );
    await showUserDetail(ctx, telegramId);
  });

  bot.callbackQuery("admin:search_users", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    if (!(globalThis as any).__adminSearchState)
      (globalThis as any).__adminSearchState = {};
    (globalThis as any).__adminSearchState[ctx.from!.id] = true;
    await ctx.reply("🔍 Send a username or Telegram ID to search:", {
      reply_markup: new InlineKeyboard().text("🔙 Back", "admin:back"),
    });
  });

  bot.on("message:text", async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    if (!(await isUserAdmin(userId))) return next();

    const text = ctx.message?.text;
    if (!text) return next();
    if (text.startsWith("/") || text.startsWith("admin_")) return next();

    const state = (globalThis as any).__adminSearchState;
    if (state && state[userId]) {
      delete state[userId];
      const users = await searchUsers(text);
      if (!users.length) {
        await ctx.reply("No users found.", {
          reply_markup: new InlineKeyboard().text("🔙 Back", "admin:back"),
        });
        return;
      }
      showUsersList(ctx, users, 1);
      return;
    }
    return next();
  });
}

function showUsersList(ctx: Context, users: any[], page: number) {
  const { items, totalPages } = paginateArray(users, page, USERS_PER_PAGE);

  let text = `👥 Users (Page ${page}/${totalPages}, ${users.length} total)\n\n`;
  for (const u of items) {
    const name = u.username
      ? `@${u.username}`
      : u.first_name || String(u.telegram_id);
    const status = u.is_banned ? " 🚫" : u.is_admin ? " 👑" : "";
    text += `• ${truncate(name, 20)}${status}\n  ID: ${u.telegram_id} | Joined: ${formatDate(u.created_at)}\n`;
  }

  const kb = new InlineKeyboard();
  for (const u of items) {
    const name = truncate(
      u.username ? `@${u.username}` : u.first_name || String(u.telegram_id),
      20,
    );
    kb.text(`👤 ${name}`, `admin_user:${u.telegram_id}`).row();
  }
  if (totalPages > 1) {
    kb.row();
    if (page > 1) kb.text("◀️ Prev", `admin_users_page:${page - 1}`);
    if (page < totalPages) kb.text("▶️ Next", `admin_users_page:${page + 1}`);
  }
  kb.row().text("🔙 Back", "admin:back").text("🏠 Menu", "cmd:main");

  if (ctx.callbackQuery) {
    ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  } else {
    ctx.reply(text, { reply_markup: kb });
  }
}

async function showUserDetail(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  if (!user) {
    ctx.reply("User not found.");
    return;
  }

  const cmdCount = await getUserCommandCount(telegramId);
  const name = user.username
    ? `@${user.username}`
    : `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Unknown";

  const statusEmoji = user.is_banned ? "🚫" : user.is_admin ? "👑" : "✅";
  const count = user.image_count ?? 1;
  const orientation = user.orientation ?? "any";
  const animation = user.animation_mode ?? "any";
  const nsfwMode = user.nsfw_mode ?? "sfw";

  const text =
    `👤 User Detail\n\n` +
    `Name: ${name}\n` +
    `🆔 Telegram ID: ${user.telegram_id}\n` +
    `📛 Username: ${user.username ?? "N/A"}\n` +
    `Status: ${statusEmoji} ${user.is_banned ? "BANNED" : user.is_admin ? "Admin" : "Active"}\n` +
    `📊 Commands Used: ${cmdCount}\n\n` +
    `⚙️ Preferences\n` +
    `  🔞 Content: ${nsfwMode === "nsfw" ? "NSFW Only" : nsfwMode === "any" ? "SFW + NSFW" : "SFW Only"}\n` +
    `  🖼️ Images per request: ${count}\n` +
    `  📐 Orientation: ${orientation === "any" ? "Any" : orientation}\n` +
    `  🎞️ Animation: ${animation === "any" ? "Any" : animation}\n\n` +
    `📅 Joined: ${formatDate(user.created_at)}\n` +
    `🕐 Last Active: ${formatDate(user.last_active)}`;

  const kb = new InlineKeyboard()
    .text(
      user.is_banned ? "✅ Unban User" : "🚫 Ban User",
      `admin_ban:${telegramId}`,
    )
    .row()
    .text("👥 Back to Users", "admin:users")
    .text("👑 Admin Panel", "admin:back");

  if (ctx.callbackQuery) {
    ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  } else {
    ctx.reply(text, { reply_markup: kb });
  }
}
