import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { tr } from "../../i18n/index.js";

export function registerAdminPanel(bot: any) {
  bot.command("admin", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const { isUserAdmin } = await import("../../db/queries.js");
    if (!(await isUserAdmin(userId))) {
      await ctx.reply(tr("admin_panel_title", ctx));
      return;
    }
    await showAdminPanel(ctx);
  });

  bot.callbackQuery("cmd:admin", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const { isUserAdmin } = await import("../../db/queries.js");
    if (!(await isUserAdmin(userId))) {
      await ctx.answerCallbackQuery({ text: tr("admin_panel_title", ctx), show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx);
  });

  bot.callbackQuery("admin:back", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx);
  });
}

async function showAdminPanel(ctx: Context) {
  const { getUserCount } = await import("../../db/queries.js");
  const totalUsers = await getUserCount();

  const kb = new InlineKeyboard()
    .text(`${tr("admin_users", ctx)} (${totalUsers})`, "admin:users")
    .text(tr("admin_search_users", ctx), "admin:search_users")
    .row()
    .text(tr("admin_broadcast", ctx), "admin:broadcast")
    .text(tr("admin_statistics", ctx), "admin:stats")
    .row()
    .text(tr("admin_api_stats", ctx), "admin:api_stats")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  const text =
    `${tr("admin_panel_title", ctx)}\n\n` +
    `👥 ${tr("admin_total_users", ctx)}: ${totalUsers}\n\n` +
    `${tr("admin_select", ctx)}`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
