import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getUserCount, getActiveUserCount, getTopCommands, getNewUserCount } from "../../db/queries.js";
import { getPublicStats } from "../../api/waifu.js";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";

export function registerAdminStats(bot: any) {
  bot.callbackQuery("admin:stats", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await showDetailedStats(ctx);
  });

  bot.callbackQuery("admin:api_stats", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    try {
      const stats = await getPublicStats();
      const text =
        `${tr("stats_title", ctx)}\n\n` +
        `📈 ${tr("stats_requests", ctx)}: ${stats.totalRequests.toLocaleString()}\n` +
        `🖼️ ${tr("stats_images", ctx)}: ${stats.totalImages.toLocaleString()}\n` +
        `🏷️ ${tr("stats_tags", ctx)}: ${stats.totalTags.toLocaleString()}\n` +
        `🎨 ${tr("stats_artists", ctx)}: ${stats.totalArtists.toLocaleString()}`;

      const kb = new InlineKeyboard().text(tr("btn_back", ctx), "admin:back").text(tr("btn_menu", ctx), "cmd:main");
      if (ctx.callbackQuery) await ctx.editMessageText(text, { reply_markup: kb }).catch(() => ctx.reply(text, { reply_markup: kb }));
      else await ctx.reply(text, { reply_markup: kb });
    } catch (err) {
      logger.error("API stats error:", err);
      await ctx.reply(tr("stats_failed", ctx), { reply_markup: new InlineKeyboard().text(tr("btn_back", ctx), "admin:back") });
    }
  });
}

async function showDetailedStats(ctx: Context) {
  const totalUsers = await getUserCount();
  const activeDay = await getActiveUserCount(1);
  const activeWeek = await getActiveUserCount(7);
  const activeMonth = await getActiveUserCount(30);
  const newDay = await getNewUserCount(1);
  const newWeek = await getNewUserCount(7);
  const topCommands = await getTopCommands(5);

  let text = `${tr("lb_active_title", ctx)}\n\n👥 Users: ${totalUsers}\n  24h: ${activeDay} | 7d: ${activeWeek} | 30d: ${activeMonth}\n  New 24h: ${newDay} | 7d: ${newWeek}\n\n`;
  if (topCommands.length) {
    text += `📊 Top Commands\n`;
    for (const cmd of topCommands) text += `  ${cmd.command}: ${cmd.count}\n`;
  }

  const kb = new InlineKeyboard().text(tr("btn_back", ctx), "admin:back").text(tr("btn_menu", ctx), "cmd:main");
  if (ctx.callbackQuery) ctx.editMessageText(text, { reply_markup: kb }).catch(() => ctx.reply(text, { reply_markup: kb }));
  else ctx.reply(text, { reply_markup: kb });
}
