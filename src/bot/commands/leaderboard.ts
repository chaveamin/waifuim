import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getMostActiveUsers,
  getMostFavoritedUsers,
  getMostAlbumCreators,
  getUserCount,
  getFavoriteCount,
  getAlbumsTotalCount,
  getDailySubscribersCount,
} from "../../db/queries.js";
import { getUser } from "../../db/queries.js";
import { tr } from "../../i18n/index.js";

export function registerLeaderboard(bot: any) {
  bot.command("leaderboard", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showLeaderboard(ctx, userId);
  });

  bot.callbackQuery("lb:main", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showLeaderboard(ctx, userId);
  });

  bot.callbackQuery("lb:active", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await showActiveLeaderboard(ctx);
  });

  bot.callbackQuery("lb:favorites", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await showFavoritesLeaderboard(ctx);
  });

  bot.callbackQuery("lb:albums", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await showAlbumsLeaderboard(ctx);
  });

  bot.callbackQuery("lb:me", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showMyStats(ctx, userId);
  });
}

function displayName(user: {
  username: string | null;
  first_name: string | null;
  telegram_id: number;
}): string {
  return user.username
    ? `@${user.username}`
    : user.first_name || String(user.telegram_id);
}

function medal(i: number): string {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
}

async function showLeaderboard(ctx: Context, userId: number) {
  const totalUsers = await getUserCount();
  const totalAlbums = await getAlbumsTotalCount();
  const dailyCount = await getDailySubscribersCount();

  const text =
    `${tr("lb_title", ctx)}\n\n` +
    `${tr("lb_community", ctx)}\n` +
    `  ${tr("lb_users", ctx)}: ${totalUsers}\n` +
    `  ${tr("lb_albums", ctx)}: ${totalAlbums}\n` +
    `  ${tr("lb_daily_sub", ctx)}: ${dailyCount}\n\n`;

  const kb = new InlineKeyboard()
    .text(tr("lb_active", ctx), "lb:active")
    .text(tr("lb_most_fav", ctx), "lb:favorites")
    .row()
    .text(tr("lb_most_albums", ctx), "lb:albums")
    .text(tr("lb_my_stats", ctx), "lb:me")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showActiveLeaderboard(ctx: Context) {
  const users = await getMostActiveUsers(10);
  let text = `${tr("lb_active_title", ctx)}\n\n`;
  if (!users.length) text += tr("lb_no_data", ctx);
  else
    for (let i = 0; i < users.length; i++)
      text += `${medal(i)} ${displayName(users[i])} — ${users[i].command_count} ${tr("lb_commands", ctx)}\n`;

  const kb = new InlineKeyboard()
    .text(tr("btn_back", ctx), "lb:main")
    .text(tr("btn_menu", ctx), "cmd:main");

  if (ctx.callbackQuery)
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  else await ctx.reply(text, { reply_markup: kb });
}

async function showFavoritesLeaderboard(ctx: Context) {
  const users = await getMostFavoritedUsers(10);
  let text = `${tr("lb_most_fav_title", ctx)}\n\n`;
  if (!users.length) text += tr("lb_no_data", ctx);
  else
    for (let i = 0; i < users.length; i++)
      text += `${medal(i)} ${displayName(users[i])} — ${users[i].fav_count}\n`;

  const kb = new InlineKeyboard()
    .text(tr("btn_back", ctx), "lb:main")
    .text(tr("btn_menu", ctx), "cmd:main");

  if (ctx.callbackQuery)
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  else await ctx.reply(text, { reply_markup: kb });
}

async function showAlbumsLeaderboard(ctx: Context) {
  const users = await getMostAlbumCreators(10);
  let text = `${tr("lb_most_albums_title", ctx)}\n\n`;
  if (!users.length) text += tr("lb_no_data", ctx);
  else
    for (let i = 0; i < users.length; i++)
      text += `${medal(i)} ${displayName(users[i])} — ${users[i].album_count}\n`;

  const kb = new InlineKeyboard()
    .text(tr("btn_back", ctx), "lb:main")
    .text(tr("btn_menu", ctx), "cmd:main");

  if (ctx.callbackQuery)
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  else await ctx.reply(text, { reply_markup: kb });
}

async function showMyStats(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  if (!user) return;
  const cmdCount = await (
    await import("../../db/queries.js")
  ).getUserCommandCount(telegramId);
  const favCount = await getFavoriteCount(telegramId);

  const allActive = await getMostActiveUsers(1000);
  const activeRank = allActive.findIndex((u) => u.telegram_id === telegramId);
  const allFavs = await getMostFavoritedUsers(1000);
  const favRank = allFavs.findIndex((u) => u.telegram_id === telegramId);

  const text =
    `${tr("lb_my_stats_title", ctx)}\n\n` +
    `🔥 ${tr("profile_commands", ctx)}: ${cmdCount}` +
    (activeRank >= 0 ? ` (#${activeRank + 1})` : "") +
    `\n` +
    `❤️ ${tr("profile_favorites", ctx)}: ${favCount}` +
    (favRank >= 0 ? ` (#${favRank + 1})` : "") +
    `\n` +
    `📅 ${tr("lb_member_since", ctx)}: ${user.created_at}\n` +
    `🕐 ${tr("lb_last_active", ctx)}: ${user.last_active}`;

  const kb = new InlineKeyboard()
    .text(tr("btn_back", ctx), "lb:main")
    .text(tr("btn_menu", ctx), "cmd:main");

  if (ctx.callbackQuery)
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  else await ctx.reply(text, { reply_markup: kb });
}
