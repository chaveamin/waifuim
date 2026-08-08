import { Context, NextFunction } from "grammy";
import { InlineKeyboard } from "grammy";
import { getAllNonBannedUsers, logBroadcast } from "../../db/queries.js";

type BroadcastPreview =
  | { type: "text"; text: string }
  | {
      type: "photo" | "video" | "document" | "animation" | "audio" | "voice";
      file_id: string;
      caption?: string;
    };

const broadcastState = new Map<
  number,
  { step: "waiting"; preview?: BroadcastPreview }
>();

export function registerAdminBroadcast(bot: any) {
  bot.on("message", async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const state = broadcastState.get(userId);
    if (!state || state.step !== "waiting") return next();

    const msg = ctx.message as any;

    if (msg.text && msg.text.startsWith("/")) return next();

    if (msg.text) {
      state.preview = { type: "text", text: msg.text };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");

      await ctx.reply(
        `<b>Broadcast Preview:</b>\n\n${msg.text}\n\n<i>Send this to all users?</i>`,
        {
          parse_mode: "HTML",
          reply_markup: kb,
        },
      );
      return;
    }

    if (msg.photo && msg.photo.length) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      state.preview = { type: "photo", file_id: fileId, caption: msg.caption };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithPhoto(fileId, {
        caption: msg.caption ?? "",
        parse_mode: "HTML",
        reply_markup: kb as any,
      });
      return;
    }

    if (msg.video) {
      state.preview = {
        type: "video",
        file_id: msg.video.file_id,
        caption: msg.caption,
      };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithVideo(msg.video.file_id, {
        caption: msg.caption ?? "",
        parse_mode: "HTML",
        reply_markup: kb as any,
      });
      return;
    }

    if (msg.document) {
      state.preview = {
        type: "document",
        file_id: msg.document.file_id,
        caption: msg.caption,
      };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithDocument(msg.document.file_id, {
        caption: msg.caption ?? "",
        parse_mode: "HTML",
        reply_markup: kb as any,
      });
      return;
    }

    if (msg.animation) {
      state.preview = {
        type: "animation",
        file_id: msg.animation.file_id,
        caption: msg.caption,
      };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithAnimation(msg.animation.file_id, {
        caption: msg.caption ?? "",
        parse_mode: "HTML",
        reply_markup: kb as any,
      });
      return;
    }

    if (msg.audio) {
      state.preview = {
        type: "audio",
        file_id: msg.audio.file_id,
        caption: msg.caption,
      };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithAudio(msg.audio.file_id, {
        caption: msg.caption ?? "",
        parse_mode: "HTML",
        reply_markup: kb as any,
      });
      return;
    }

    if (msg.voice) {
      state.preview = { type: "voice", file_id: msg.voice.file_id };
      const kb = new InlineKeyboard()
        .text("✅ Send Broadcast", "broadcast:confirm")
        .text("❌ Cancel", "broadcast:cancel");
      await ctx.replyWithVoice(msg.voice.file_id, { reply_markup: kb as any });
      return;
    }

    return next();
  });

  bot.callbackQuery("admin:broadcast", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    broadcastState.set(userId, { step: "waiting" });
    const text =
      "📢 Send the broadcast message to all users.\n\nThe message will be sent as-is. Supports HTML formatting.\nSend /cancel to abort.";
    const kb = new InlineKeyboard().text("❌ Cancel", "admin:back");
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(text, { reply_markup: kb })
        .catch(() => ctx.reply(text, { reply_markup: kb }));
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
      const noKb = new InlineKeyboard().text(
        "🔙 Back to Admin Panel",
        "admin:back",
      );
      if (ctx.callbackQuery) {
        await ctx
          .editMessageText(noMsg, { reply_markup: noKb })
          .catch(() => ctx.reply(noMsg, { reply_markup: noKb }));
      } else {
        await ctx.reply(noMsg, { reply_markup: noKb });
      }
      return;
    }

    const users = await getAllNonBannedUsers();
    let sent = 0;
    let failed = 0;

    const preview = state.preview;

    for (const user of users) {
      try {
        if (preview.type === "text") {
          await ctx.api.sendMessage(user.telegram_id, preview.text, {
            parse_mode: "HTML",
          });
        } else if (preview.type === "photo") {
          await ctx.api.sendPhoto(user.telegram_id, preview.file_id, {
            caption: preview.caption ?? "",
            parse_mode: "HTML",
          });
        } else if (preview.type === "video") {
          await ctx.api.sendVideo(user.telegram_id, preview.file_id, {
            caption: preview.caption ?? "",
            parse_mode: "HTML",
          });
        } else if (preview.type === "document") {
          await ctx.api.sendDocument(user.telegram_id, preview.file_id, {
            caption: preview.caption ?? "",
            parse_mode: "HTML",
          });
        } else if (preview.type === "animation") {
          await ctx.api.sendAnimation(user.telegram_id, preview.file_id, {
            caption: preview.caption ?? "",
            parse_mode: "HTML",
          });
        } else if (preview.type === "audio") {
          await ctx.api.sendAudio(user.telegram_id, preview.file_id, {
            caption: preview.caption ?? "",
            parse_mode: "HTML",
          });
        } else if (preview.type === "voice") {
          await ctx.api.sendVoice(user.telegram_id, preview.file_id);
        }
        sent++;
      } catch (err) {
        failed++;
      }
    }

    broadcastState.delete(userId);

    const logMessage =
      preview.type === "text"
        ? preview.text
        : (preview.caption ?? `<${preview.type}>`);
    await logBroadcast(userId, logMessage, sent);

    const kb = new InlineKeyboard()
      .text("🔙 Back to Admin Panel", "admin:back")
      .text("🏠 Main Menu", "cmd:main");
    const resultText =
      `✅ Broadcast complete!\n\n` +
      `📤 Sent: ${sent}\n` +
      `❌ Failed: ${failed}\n` +
      `👥 Total: ${users.length}`;
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(resultText, { reply_markup: kb })
        .catch(() => ctx.reply(resultText, { reply_markup: kb }));
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
    const cancelKb = new InlineKeyboard().text(
      "🔙 Back to Admin Panel",
      "admin:back",
    );
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(cancelText, { reply_markup: cancelKb })
        .catch(() => ctx.reply(cancelText, { reply_markup: cancelKb }));
    } else {
      await ctx.reply(cancelText, { reply_markup: cancelKb });
    }
  });
}

export function getBroadcastState() {
  return broadcastState;
}
