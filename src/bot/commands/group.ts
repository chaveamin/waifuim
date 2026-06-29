import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import { buildSearchParams } from "../../utils/imageHelpers.js";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";

export async function sendGroup(ctx: Context) {
  await ctx.replyWithChatAction("upload_photo");
  try {
    const userId = ctx.from?.id!;
    const user = await getUser(userId);
    const params = buildSearchParams(user);
    const result = await searchImages(params);

    if (!result.items.length) {
      const noResult = tr("no_images", ctx);
      const noKb = new InlineKeyboard().text(
        tr("btn_settings", ctx),
        "cmd:settings",
      );
      if (ctx.callbackQuery) {
        await ctx
          .editMessageText(noResult, { reply_markup: noKb })
          .catch(() => ctx.reply(noResult, { reply_markup: noKb }));
      } else {
        await ctx.reply(noResult, { reply_markup: noKb });
      }
      return;
    }

    const images = result.items.filter(
      (img) =>
        img.url.endsWith(".jpg") ||
        img.url.endsWith(".jpeg") ||
        img.url.endsWith(".png") ||
        img.url.endsWith(".gif"),
    );

    if (!images.length) {
      await ctx.reply(tr("group_failed", ctx), {
        reply_markup: new InlineKeyboard().text(
          tr("btn_back_to_menu", ctx),
          "cmd:main",
        ),
      });
      return;
    }

    const isDoc = user?.send_mode === "document";
    const media = images.map((img, i) => ({
      type: isDoc ? ("document" as const) : ("photo" as const),
      media: img.url,
    }));
    await ctx.replyWithMediaGroup(media);

    let text = `${images.length} ${tr("group_sent", ctx)}\n\n`;
    for (const img of images) {
      const artists = img.artists.map((a) => a.name).join(", ") || "Unknown";
      text += `#${img.id} - ${tr("image_artist", ctx)}: ${artists}\n`;
    }

    const kb = new InlineKeyboard();
    for (const img of images) {
      const fav = await isFavorited(userId, img.id);
      kb.text(
        fav ? tr("btn_unfav", ctx) : tr("btn_fav", ctx),
        `fav_toggle:${img.id}`,
      );
      kb.text(tr("btn_albums_pick", ctx), `pick_album:${img.id}`).row();
    }
    kb.text(tr("btn_another_group", ctx), "cmd:group")
      .row()
      .text(tr("btn_change_settings", ctx), "cmd:settings")
      .text(tr("btn_menu", ctx), "cmd:main");

    await ctx.reply(text, { reply_markup: kb });
  } catch (err) {
    logger.error(tr("group_err", ctx), err);
    await ctx.reply(tr("group_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

export function registerGroup(bot: any) {
  bot.command("group", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await sendGroup(ctx);
  });
}
