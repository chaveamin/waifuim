import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import { buildImageCaption, buildImageKb, buildSearchParams } from "../../utils/imageHelpers.js";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";

export function registerRandom(bot: any) {
  bot.command("random", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.replyWithChatAction("upload_photo");

    const user = await getUser(userId);

    try {
      const params = buildSearchParams(user, { PageSize: 1 });
      const result = await searchImages(params);

      if (!result.items.length) {
        await ctx.reply(tr("no_images", ctx), {
          reply_markup: new InlineKeyboard().text(tr("btn_settings", ctx), "cmd:settings"),
        });
        return;
      }

      const image = result.items[0];
      const fav = await isFavorited(userId, image.id);
      const caption = buildImageCaption(image, ctx);
      const kb = buildImageKb(image.id, fav);
      await ctx.replyWithPhoto(image.url, { caption, reply_markup: kb, parse_mode: "Markdown" });
    } catch (err) {
      logger.error("Random image error:", err);
      await ctx.reply(tr("random_failed", ctx), {
        reply_markup: new InlineKeyboard().text(tr("btn_back_to_menu", ctx), "cmd:main"),
      });
    }
  });
}
