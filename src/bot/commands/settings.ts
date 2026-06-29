import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getUser,
  setNsfwMode,
  setImageCount,
  setOrientation,
  setAnimationMode,
  setSendMode,
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

  bot.callbackQuery(/^set_send_mode:(.+)$/, async (ctx: Context) => {
    const mode = ctx.match![1];
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    if (["photo", "document"].includes(mode)) await setSendMode(userId, mode);
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
  const sendMode = user?.send_mode ?? "photo";
  const lang = getLang(ctx);

  const nsfwLabel = config.nsfwAllowed
    ? nsfwMode === "nsfw"
      ? `✅ ${tr("settings_nsfw_only", ctx)}`
      : nsfwMode === "any"
        ? `✅ ${tr("settings_sfw_nsfw", ctx)}`
        : `✅ ${tr("settings_sfw_only", ctx)}`
    : `${tr("settings_sfw_only", ctx)} ${tr("settings_admin_locked", ctx)}`;

  const text =
    `${tr("settings_title", ctx)}\n\n` +
    `${tr("settings_content", ctx)}: ${nsfwLabel}\n` +
    `${tr("settings_images_per", ctx)}: ${count}\n` +
    `${tr("settings_orientation", ctx)}: ${orientation === "landscape" ? tr("settings_landscape", ctx) : orientation === "portrait" ? tr("settings_portrait", ctx) : tr("settings_any", ctx)}\n` +
    `${tr("settings_animation", ctx)}: ${animation === "animated" ? tr("settings_animated", ctx) : animation === "static" ? tr("settings_static", ctx) : tr("settings_any", ctx)}\n\n` +
    `${tr("settings_tap_change", ctx)}`;

  const kb = new InlineKeyboard();

  // Content
  if (config.nsfwAllowed) {
    kb.add({
      text: tr("settings_content", ctx),
      callback_data: ".",
    }).row();
    kb.add({
      text: tr("settings_sfw_only", ctx),
      callback_data: "set_nsfw:sfw",
      style: nsfwMode === "sfw" ? "success" : "primary",
    });
    kb.add({
      text: tr("settings_nsfw_only", ctx),
      callback_data: "set_nsfw:nsfw",
      style: nsfwMode === "nsfw" ? "success" : "primary",
    });
    kb.add({
      text: tr("settings_sfw_nsfw", ctx),
      callback_data: "set_nsfw:any",
      style: nsfwMode === "any" ? "success" : "primary",
    }).row();
  }

  // Count
  kb.add({
    text: tr("settings_img_count", ctx),
    callback_data: ".",
  }).row();
  kb.add(
    {
      text: "1",
      callback_data: "set_count:1",
      style: count === 1 ? "success" : "primary",
    },
    {
      text: "3",
      callback_data: "set_count:3",
      style: count === 3 ? "success" : "primary",
    },
  );
  kb.add(
    {
      text: "5",
      callback_data: "set_count:5",
      style: count === 5 ? "success" : "primary",
    },
    {
      text: "10",
      callback_data: "set_count:10",
      style: count === 10 ? "success" : "primary",
    },
  ).row();

  // Orientation
  kb.add({
    text: tr("settings_orientation", ctx),
    callback_data: ".",
  }).row();
  kb.add(
    {
      text: tr("settings_landscape", ctx),
      callback_data: "set_orientation:landscape",
      style: orientation === "landscape" ? "success" : "primary",
    },
    {
      text: tr("settings_portrait", ctx),
      callback_data: "set_orientation:portrait",
      style: orientation === "portrait" ? "success" : "primary",
    },
  );
  kb.add({
    text: tr("settings_any", ctx),
    callback_data: "set_orientation:any",
    style: orientation === "any" ? "success" : "primary",
  }).row();

  // Animated/Static
  kb.add({
    text: tr("settings_style", ctx),
    callback_data: ".",
  }).row();
  kb.add(
    {
      text: tr("settings_animated", ctx),
      callback_data: "set_animation:animated",
      style: animation === "animated" ? "success" : "primary",
    },
    {
      text: tr("settings_static", ctx),
      callback_data: "set_animation:static",
      style: animation === "static" ? "success" : "primary",
    },
  );
  kb.add({
    text: tr("settings_any", ctx),
    callback_data: "set_animation:any",
    style: animation === "any" ? "success" : "primary",
  }).row();

  // Mode
  kb.add({
    text: tr("settings_mode", ctx),
    callback_data: ".",
  }).row();
  kb.add(
    {
      text: tr("settings_photo", ctx),
      callback_data: "set_send_mode:photo",
      style: sendMode === "photo" ? "success" : "primary",
    },
    {
      text: tr("settings_document", ctx),
      callback_data: "set_send_mode:document",
      style: sendMode === "document" ? "success" : "primary",
    },
  ).row();

  // Language
  kb.add({
    text: tr("settings_lang", ctx),
    callback_data: ".",
  }).row();
  kb.add({
    text: lang === "fa" ? "فارسی" : "English",
    callback_data: "set_lang:pick",
    style: "primary",
  }).row();

  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
