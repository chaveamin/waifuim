import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getFavoriteCount,
  getUserFavorites,
  isFavorited,
  getUser,
} from "../../db/queries.js";
import { getImageById } from "../../api/waifu.js";
import {
  buildImageCaption,
  buildMiniImageKb,
} from "../../utils/imageHelpers.js";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";
import { replyWithMediaUniversal } from "../../utils/imageHelpers.js";

export function registerFavorites(bot: any) {
  bot.command("favorites", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showFavorites(ctx, userId, 1);
  });

  bot.callbackQuery(/^fav_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showFavorites(ctx, userId, page);
  });

  bot.callbackQuery(/^fav_view:(\d+)$/, async (ctx: Context) => {
    const imageId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");
    try {
      const image = await getImageById(imageId);
      const userId = ctx.from?.id!;
      const user = await getUser(userId);
      const fav = await isFavorited(userId, image.id);
      const caption = buildImageCaption(image, ctx);
      const kb = buildMiniImageKb(image.id, fav, ctx);
      await replyWithMediaUniversal(ctx, user, image.url, {
        caption,
        reply_markup: kb,
        parse_mode: "Markdown",
      });
    } catch (err) {
      logger.error("Fav view error:", err);
      await ctx.reply(tr("image_not_found", ctx), {
        reply_markup: new InlineKeyboard().text(
          tr("btn_back_to_menu", ctx),
          "cmd:favorites",
        ),
      });
    }
  });

  bot.callbackQuery(/^fav_toggle:(\d+)$/, async (ctx: Context) => {
    const imageId = parseInt(ctx.match![1]);
    const userId = ctx.from?.id;
    if (!userId) return;
    const { toggleFavorite } = await import("../../db/queries.js");
    const added = await toggleFavorite(userId, imageId);
    const count = await getFavoriteCount(userId);
    await ctx.answerCallbackQuery({
      text: added ? `❤️ +1 (${count})` : `💔 -1 (${count})`,
    });
    try {
      const image = await getImageById(imageId);
      const fav = await isFavorited(userId, image.id);
      const kb = buildMiniImageKb(image.id, fav, ctx);
      await ctx.editMessageReplyMarkup({ reply_markup: kb }).catch(() => {});
    } catch {}
  });
}

async function showFavorites(ctx: Context, userId: number, page: number) {
  const perPage = 5;
  const total = await getFavoriteCount(userId);
  const favs = await getUserFavorites(userId, perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  if (!favs.length) {
    const emptyText = tr("fav_empty", ctx);
    const emptyKb = new InlineKeyboard()
      .text(tr("btn_random", ctx), "cmd:random")
      .text(tr("btn_search", ctx), "cmd:search")
      .row()
      .text(tr("btn_back_to_menu", ctx), "cmd:main");
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(emptyText, { reply_markup: emptyKb })
        .catch(() => ctx.reply(emptyText, { reply_markup: emptyKb }));
    } else {
      await ctx.reply(emptyText, { reply_markup: emptyKb });
    }
    return;
  }

  let text = `${tr("fav_title", ctx)} (${total}, Page ${page}/${totalPages})\n\n`;
  for (const f of favs) text += `• 🖼️ #${f.image_id}\n`;

  const kb = new InlineKeyboard();
  for (const f of favs)
    kb.text(`🖼️ ${f.image_id}`, `fav_view:${f.image_id}`).row();
  kb.row().text(tr("btn_back_to_menu", ctx), "cmd:main");
  if (totalPages > 1) {
    if (page > 1) kb.text(`◀️ ${tr("prev_page", ctx)}`, `fav_page:${page - 1}`);
    if (page < totalPages)
      kb.text(`▶️ ${tr("next_page", ctx)}`, `fav_page:${page + 1}`);
  }

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
