import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getAllNonBannedUsers,
  logBroadcast,
} from "../../db/queries.js";

const broadcastState = new Map<number, { step: "waiting"; preview: string }>();

export function registerAdminBroadcast(bot: any) {
  bot.callbackQuery("admin:broadcast", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    broadcastState.set(userId, { step: "waiting", preview: "" });
    const text = "📢 Send the broadcast message to all users.\n\nThe message will be sent as-is. Supports HTML formatting.\nSend /cancel to abort.";
    const kb = new InlineKeyboard().text("❌ Cancel", "admin:back");
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: kb }).catch(() => ctx.reply(text, { reply_markup: kb }));
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
  });

  bot.callbackQuery("broadcast:confirm", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();

    const state = broadcastState.get(userId);
    if (!state?.preview) {
      const noMsg = "No broadcast message found.";
      const noKb = new InlineKeyboard().text("🔙 Back to Admin Panel", "admin:back");
      if (ctx.callbackQuery) {
        await ctx.editMessageText(noMsg, { reply_markup: noKb }).catch(() => ctx.reply(noMsg, { reply_markup: noKb }));
      } else {
        await ctx.reply(noMsg, { reply_markup: noKb });
      }
      return;
    }

    const users = await getAllNonBannedUsers();
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await ctx.api.sendMessage(user.telegram_id, state.preview, { parse_mode: "HTML" });
        sent++;
      } catch {
        failed++;
      }
    }

    broadcastState.delete(userId);
    await logBroadcast(userId, state.preview, sent);

    const kb = new InlineKeyboard()
      .text("🔙 Back to Admin Panel", "admin:back")
      .text("🏠 Main Menu", "cmd:main");
    const resultText =
      `✅ Broadcast complete!\n\n` +
      `📤 Sent: ${sent}\n` +
      `❌ Failed: ${failed}\n` +
      `👥 Total: ${users.length}`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(resultText, { reply_markup: kb }).catch(() => ctx.reply(resultText, { reply_markup: kb }));
    } else {
      await ctx.reply(resultText, { reply_markup: kb });
    }
  });

  bot.callbackQuery("broadcast:cancel", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    broadcastState.delete(userId);
    const cancelText = "❌ Broadcast cancelled.";
    const cancelKb = new InlineKeyboard().text("🔙 Back to Admin Panel", "admin:back");
    if (ctx.callbackQuery) {
      await ctx.editMessageText(cancelText, { reply_markup: cancelKb }).catch(() => ctx.reply(cancelText, { reply_markup: cancelKb }));
    } else {
      await ctx.reply(cancelText, { reply_markup: cancelKb });
    }
  });
}

export function getBroadcastState() {
  return broadcastState;
}
