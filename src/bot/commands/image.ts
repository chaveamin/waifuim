import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getImageById } from "../../api/waifu.js";
import { isFavorited } from "../../db/queries.js";
import { buildImageCaption, buildImageKb } from "../../utils/imageHelpers.js";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";

export function registerImage(bot: any) {
  bot.command("image", async (ctx: Context) => {
    const text = ctx.message?.text ?? "";
    const args = text.split(" ").slice(1).filter(Boolean);

    if (!args.length || isNaN(Number(args[0]))) {
      await ctx.reply(tr("image_usage", ctx), {
        reply_markup: new InlineKeyboard().text(tr("btn_back_to_menu", ctx), "cmd:main"),
      });
      return;
    }

    const id = parseInt(args[0]);
    await ctx.replyWithChatAction("upload_photo");

    try {
      const image = await getImageById(id);
      const userId = ctx.from?.id!;
      const fav = await isFavorited(userId, image.id);
      const caption = buildImageCaption(image, ctx);
      const kb = buildImageKb(image.id, fav);
      await ctx.replyWithPhoto(image.url, { caption, reply_markup: kb, parse_mode: "Markdown" });
    } catch (err) {
      logger.error("Image fetch error:", err);
      await ctx.reply(tr("image_not_found", ctx), {
        reply_markup: new InlineKeyboard().text(tr("btn_back_to_menu", ctx), "cmd:main"),
      });
    }
  });

  bot.callbackQuery(/^img_detail:(\d+)$/, async (ctx: Context) => {
    const id = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");

    try {
      const image = await getImageById(id);
      const userId = ctx.from?.id!;
      const fav = await isFavorited(userId, image.id);
      const caption = buildImageCaption(image, ctx);
      const kb = buildImageKb(image.id, fav);
      await ctx.replyWithPhoto(image.url, { caption, reply_markup: kb, parse_mode: "Markdown" });
    } catch (err) {
      logger.error("Image detail error:", err);
      await ctx.reply(tr("image_not_found", ctx), {
        reply_markup: new InlineKeyboard().text(tr("btn_back_to_menu", ctx), "cmd:main"),
      });
    }
  });
}
