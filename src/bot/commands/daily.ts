import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getUser, toggleDailySubscription, setDailyTime } from "../../db/queries.js";
import { tr } from "../../i18n/index.js";

export function registerDaily(bot: any) {
  bot.command("daily", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showDaily(ctx, userId);
  });

  bot.callbackQuery("daily:toggle", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    const subscribed = await toggleDailySubscription(userId);
    await ctx.answerCallbackQuery({ text: subscribed ? tr("daily_subscribed_text", ctx) : tr("daily_unsubscribed", ctx) });
    await showDaily(ctx, userId);
  });

  bot.callbackQuery(/^daily_time:(\d+)$/, async (ctx: Context) => {
    const hour = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await setDailyTime(userId, hour, 0);
    await showDaily(ctx, userId);
  });
}

async function showDaily(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  const subscribed = user?.daily_subscribed === 1;
  const hour = user?.daily_hour ?? 9;
  const minute = user?.daily_minute ?? 0;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const text =
    `${tr("daily_title", ctx)}\n\n` +
    `${tr("daily_not_subscribed", ctx)}: ${subscribed ? "✅" : "❌"}\n` +
    `🕐 ${tr("daily_send_time", ctx)}: ${timeStr}\n\n` +
    `${subscribed ? tr("daily_desc", ctx) : tr("daily_not_desc", ctx)}`;

  const kb = new InlineKeyboard();
  kb.text(subscribed ? tr("btn_unsubscribe", ctx) : tr("btn_subscribe", ctx), "daily:toggle").row();
  if (!subscribed) {
    kb.text("🕐 08:00", "daily_time:8")
      .text("🕐 09:00", "daily_time:9")
      .text("🕐 10:00", "daily_time:10").row()
      .text("🕐 12:00", "daily_time:12")
      .text("🕐 18:00", "daily_time:18")
      .text("🕐 20:00", "daily_time:20").row();
  }
  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
