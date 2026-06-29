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
    await showUsersList(ctx, users, 1);
  });

  bot.callbackQuery(/^admin_users_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const users = await getAllUsers();
    await showUsersList(ctx, users, page);
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
      await ctx.reply(tr("admin_no_users", ctx), {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
      return;
    }
    const newBannedState = user.is_banned !== 1;
    await setBanned(telegramId, newBannedState);
    await ctx.reply(
      `${newBannedState ? tr("admin_user_banned", ctx) : tr("admin_user_unbanned", ctx)}.`,
    );
    await showUserDetail(ctx, telegramId);
  });

  bot.callbackQuery("admin:search_users", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    if (!(globalThis as any).__adminSearchState)
      (globalThis as any).__adminSearchState = {};
    (globalThis as any).__adminSearchState[ctx.from!.id] = true;
    await ctx.reply(tr("admin_search_prompt", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back", ctx),
        "admin:back",
      ),
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
          reply_markup: new InlineKeyboard().text(
            tr("btn_back", ctx),
            "admin:back",
          ),
        });
        return;
      }
      showUsersList(ctx, users, 1);
      return;
    }
    return next();
  });
}

async function showUsersList(ctx: Context, users: any[], page: number) {
  const { items, totalPages } = paginateArray(users, page, USERS_PER_PAGE);

  let text = `${tr("admin_users", ctx)} (${tr("tags_page", ctx)} ${page}/${totalPages}, ${users.length} total)\n\n`;
  for (const u of items) {
    const name = u.username
      ? `@${u.username}`
      : u.first_name || String(u.telegram_id);
    const status = u.is_banned ? " 🚫" : u.is_admin ? "" : "";
    text += `• ${truncate(name, 20)}${status}\n  ID: ${u.telegram_id} | Joined: ${formatDate(u.created_at, ctx)}\n`;
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
    if (page < totalPages)
      kb.text(`▶️ ${tr("next_page", ctx)}`, `admin_users_page:${page + 1}`);
  }
  kb.row()
    .text(tr("btn_back", ctx), "admin:back")
    .text(tr("btn_menu", ctx), "cmd:main");

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showUserDetail(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  if (!user) {
    ctx.reply(tr("admin_usernotfound", ctx));
    return;
  }

  const cmdCount = await getUserCommandCount(telegramId);
  const name = user.username
    ? `@${user.username}`
    : `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
      tr("artist_unknown", ctx);

  const statusEmoji = user.is_banned ? "🚫" : user.is_admin ? "" : "✅";
  const count = user.image_count ?? 1;
  const orientation = user.orientation ?? "any";
  const animation = user.animation_mode ?? "any";
  const nsfwMode = user.nsfw_mode ?? "sfw";

  const text =
    `${tr("admin_user_detail", ctx)}\n\n` +
    `${tr("profile_name", ctx)}: ${name}\n` +
    `${tr("profile_id", ctx)}: ${user.telegram_id}\n` +
    `${tr("profile_user", ctx)}: ${user.username ?? tr("profile_userna", ctx)}\n` +
    `${tr("profile_status", ctx)}: ${statusEmoji} ${user.is_banned ? tr("profile_banned", ctx) : user.is_admin ? tr("profile_admin", ctx) : tr("profile_active", ctx)}\n` +
    `${tr("profile_commands", ctx)}: ${cmdCount}\n\n` +
    `${tr("profile_preferences", ctx)}\n` +
    `  ${tr("settings_content", ctx)}: ${nsfwMode === "nsfw" ? tr("settings_nsfw_only", ctx) : nsfwMode === "any" ? tr("settings_sfw_nsfw", ctx) : tr("settings_sfw_only", ctx)}\n` +
    `  ${tr("settings_images_per", ctx)}: ${count}\n` +
    `  ${tr("settings_orientation", ctx)}: ${orientation === "any" ? tr("settings_any", ctx) : orientation}\n` +
    `  ${tr("settings_animation", ctx)}: ${animation === "any" ? tr("settings_any", ctx) : animation}\n\n` +
    `${tr("profile_joined", ctx)}: ${formatDate(user.created_at, ctx)}\n` +
    `${tr("profile_last_active", ctx)}: ${formatDate(user.last_active, ctx)}`;

  const kb = new InlineKeyboard()
    .text(
      user.is_banned ? tr("admin_unban_user", ctx) : tr("admin_ban_user", ctx),
      `admin_ban:${telegramId}`,
    )
    .row()
    .text(tr("btn_backusers", ctx), "admin:users")
    .text(tr("admin_panel_title", ctx), "admin:back");

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
