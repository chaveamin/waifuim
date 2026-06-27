import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getUser,
  setNsfwMode,
  setImageCount,
  setOrientation,
  setAnimationMode,
} from "../../db/queries.js";
import { config } from "../../config.js";
import { tr, getLang } from "../../i18n/index.js";

export function registerSettings(bot: any) {
  bot.command("settings", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showSettings(ctx, userId);
  });

  bot.callbackQuery("settings:main", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showSettings(ctx, userId);
  });

  bot.callbackQuery(/^set_nsfw:(.+)$/, async (ctx: Context) => {
    const value = ctx.match![1];
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    if (["sfw", "nsfw", "any"].includes(value))
      await setNsfwMode(userId, value);
    await showSettings(ctx, userId);
  });

  bot.callbackQuery(/^set_count:(.+)$/, async (ctx: Context) => {
    const count = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await setImageCount(userId, count);
    await showSettings(ctx, userId);
  });

  bot.callbackQuery(/^set_orientation:(.+)$/, async (ctx: Context) => {
    const orientation = ctx.match![1];
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await setOrientation(userId, orientation);
    await showSettings(ctx, userId);
  });

  bot.callbackQuery(/^set_animation:(.+)$/, async (ctx: Context) => {
    const mode = ctx.match![1];
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await setAnimationMode(userId, mode);
    await showSettings(ctx, userId);
  });

  bot.callbackQuery("toggle_nsfw", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    await showSettings(ctx, userId);
  });
}

async function showSettings(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  const nsfwMode = user?.nsfw_mode ?? "sfw";
  const count = user?.image_count ?? 1;
  const orientation = user?.orientation ?? "any";
  const animation = user?.animation_mode ?? "any";
  const lang = getLang(ctx);

  const nsfwLabel = config.nsfwAllowed
    ? nsfwMode === "nsfw"
      ? `✅ ${tr("settings_nsfw_only", ctx)}`
      : nsfwMode === "any"
        ? `✅ ${tr("settings_sfw_nsfw", ctx)}`
        : `✅ ${tr("settings_sfw_only", ctx)}`
    : `🔒 ${tr("settings_sfw_only", ctx)} ${tr("settings_admin_locked", ctx)}`;

  const text =
    `${tr("settings_title", ctx)}\n\n` +
    `${tr("settings_content", ctx)}: ${nsfwLabel}\n` +
    `${tr("settings_images_per", ctx)}: ${count}\n` +
    `${tr("settings_orientation", ctx)}: ${orientation === "landscape" ? tr("settings_landscape", ctx) : orientation === "portrait" ? tr("settings_portrait", ctx) : tr("settings_any", ctx)}\n` +
    `${tr("settings_animation", ctx)}: ${animation === "animated" ? tr("settings_animated", ctx) : animation === "static" ? tr("settings_static", ctx) : tr("settings_any", ctx)}\n\n` +
    `${tr("settings_tap_change", ctx)}`;

  const kb = new InlineKeyboard();
  if (config.nsfwAllowed) {
    kb.text(
      nsfwMode === "sfw"
        ? `✅ 🔒 ${tr("settings_sfw_only", ctx)}`
        : `🔒 ${tr("settings_sfw_only", ctx)}`,
      "set_nsfw:sfw",
    );
    kb.text(
      nsfwMode === "any"
        ? `✅ 🔄 ${tr("settings_sfw_nsfw", ctx)}`
        : `🔄 ${tr("settings_sfw_nsfw", ctx)}`,
      "set_nsfw:any",
    ).row();
    kb.text(
      nsfwMode === "nsfw"
        ? `✅ 🔞 ${tr("settings_nsfw_only", ctx)}`
        : `🔞 ${tr("settings_nsfw_only", ctx)}`,
      "set_nsfw:nsfw",
    ).row();
  }
  kb.text(count === 1 ? "✅ 1" : "1", "set_count:1")
    .text(count === 3 ? "✅ 3" : "3", "set_count:3")
    .row()
    .text(count === 5 ? "✅ 5" : "5", "set_count:5")
    .text(count === 10 ? "✅ 10" : "10", "set_count:10")
    .row();
  kb.text(
    orientation === "landscape"
      ? `✅ 🌄 ${tr("settings_landscape", ctx)}`
      : `🌄 ${tr("settings_landscape", ctx)}`,
    "set_orientation:landscape",
  )
    .text(
      orientation === "portrait"
        ? `✅ 🖼️ ${tr("settings_portrait", ctx)}`
        : `🖼️ ${tr("settings_portrait", ctx)}`,
      "set_orientation:portrait",
    )
    .row()
    .text(
      orientation === "any"
        ? `✅ 🔄 ${tr("settings_any", ctx)}`
        : `🔄 ${tr("settings_any", ctx)}`,
      "set_orientation:any",
    )
    .row();
  kb.text(
    animation === "animated"
      ? `✅ 🎞️ ${tr("settings_animated", ctx)}`
      : `🎞️ ${tr("settings_animated", ctx)}`,
    "set_animation:animated",
  )
    .text(
      animation === "static"
        ? `✅ 🖼️ ${tr("settings_static", ctx)}`
        : `🖼️ ${tr("settings_static", ctx)}`,
      "set_animation:static",
    )
    .row()
    .text(
      animation === "any"
        ? `✅ 🔄 ${tr("settings_any", ctx)}`
        : `🔄 ${tr("settings_any", ctx)}`,
      "set_animation:any",
    )
    .row();
  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
