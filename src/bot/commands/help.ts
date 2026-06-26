import { Context } from "grammy";
import { config } from "../../config.js";
import { InlineKeyboard } from "grammy";
import { tr } from "../../i18n/index.js";

export function registerHelp(bot: any) {
  bot.command("help", async (ctx: Context) => {
    const text =
      `${tr("help_title", ctx)}\n\n` +
      `${tr("cmd_random", ctx)}\n` +
      `${tr("cmd_group", ctx)}\n` +
      `${tr("cmd_daily", ctx)}\n` +
      `${tr("cmd_albums", ctx)}\n` +
      `${tr("cmd_leaderboard", ctx)}\n` +
      `${tr("cmd_search", ctx)}\n` +
      `${tr("cmd_tags", ctx)}\n` +
      `${tr("cmd_artists", ctx)}\n` +
      `${tr("cmd_image", ctx)}\n` +
      `${tr("cmd_favorites", ctx)}\n` +
      `${tr("cmd_profile", ctx)}\n` +
      `${tr("cmd_settings", ctx)}\n` +
      `${tr("cmd_stats", ctx)}\n\n` +
      `${tr("tip_fav_album", ctx)}\n` +
      `${tr("tip_settings", ctx)}\n\n` +
      `${tr("inline_mode", ctx)}\n` +
      `${tr("inline_tip", ctx)}\n\n` +
      `Examples:\n/random\n/group\n/search waifu maid\n/image 1234`;

    const isAdmin = config.adminTelegramId && ctx.from?.id === config.adminTelegramId;
    const adminText = isAdmin ? `\n\n${tr("admin_commands", ctx)}\n${tr("admin_panel", ctx)}` : "";

    const kb = new InlineKeyboard()
      .text(tr("btn_random", ctx), "cmd:random")
      .text(tr("btn_send_group", ctx), "cmd:group")
      .row()
      .text(tr("btn_search", ctx), "cmd:search")
      .text(tr("btn_tags", ctx), "cmd:tags")
      .row()
      .text(tr("btn_artists", ctx), "cmd:artists")
      .text(tr("btn_favorites", ctx), "cmd:favorites")
      .row()
      .text(tr("btn_albums", ctx), "cmd:albums")
      .text(tr("btn_daily", ctx), "cmd:daily")
      .row()
      .text(tr("btn_profile", ctx), "cmd:profile")
      .text(tr("btn_settings", ctx), "cmd:settings")
      .row()
      .text(tr("btn_leaderboard", ctx), "cmd:leaderboard");

    if (isAdmin) kb.row().text(tr("btn_admin_panel", ctx), "cmd:admin");

    await ctx.reply(text + adminText, { reply_markup: kb });
  });
}
