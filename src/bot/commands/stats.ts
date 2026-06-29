import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getPublicStats } from "../../api/waifu.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";

export function registerStats(bot: any) {
  bot.command("stats", async (ctx: Context) => {
    try {
      const stats = await getPublicStats();
      const text =
        `API Statistics\n\n` +
        `Total Requests: ${stats.totalRequests.toLocaleString()}\n` +
        `Total Images: ${stats.totalImages.toLocaleString()}\n` +
        `Total Tags: ${stats.totalTags.toLocaleString()}\n` +
        `Total Artists: ${stats.totalArtists.toLocaleString()}`;

      const kb = new InlineKeyboard().text(
        `${tr("btn_back_to_menu", ctx)}`,
        "cmd:main",
      );
      await ctx.reply(text, { reply_markup: kb });
    } catch (err) {
      logger.error("Stats error:", err);
      await ctx.reply("Failed to fetch statistics.", {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });
}
