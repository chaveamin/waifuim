import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import {
  buildImageCaption,
  buildImageKb,
  buildSearchParams,
} from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";
import { replyWithMediaUniversal } from "../../utils/imageHelpers.js";

export function registerSearch(bot: any) {
  bot.command("search", async (ctx: Context) => {
    const text = ctx.message?.text ?? "";
    const args = text.split(" ").slice(1).filter(Boolean);

    if (!args.length) {
      const kb = new InlineKeyboard()
        .text("waifu", "search_tag:waifu")
        .text("maid", "search_tag:maid")
        .text("marin-kitagawa", "search_tag:marin-kitagawa")
        .row()
        .text("mori-calliope", "search_tag:mori-calliope")
        .text("raiden-shogun", "search_tag:raiden-shogun")
        .text("oppai", "search_tag:oppai")
        .row()
        .text("selfies", "search_tag:selfies")
        .text("uniform", "search_tag:uniform")
        .text("game-console", "search_tag:game-console")
        .row()
        .text("🎲 Random SFW", "search_random:sfw")
        .text("🎲 Random NSFW", "search_random:nsfw")
        .row()
        .text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");

      await ctx.reply("🔍 Select tags or enter /search <tag1> <tag2>:", {
        reply_markup: kb,
      });
      return;
    }

    await performSearch(ctx, args, 1);
  });

  bot.callbackQuery(/^search_tag:(.+)$/, async (ctx: Context) => {
    const tag = ctx.match![1];
    await ctx.answerCallbackQuery();
    await performSearch(ctx, [tag], 1);
  });

  bot.callbackQuery(/^search_page:(.+):(\d+)$/, async (ctx: Context) => {
    const tagsStr = ctx.match![1];
    const page = parseInt(ctx.match![2]);
    const tags = tagsStr.split(",");
    await ctx.answerCallbackQuery();
    await performSearch(ctx, tags, page);
  });

  bot.callbackQuery(/^search_random:(.+)$/, async (ctx: Context) => {
    const mode = ctx.match![1];
    await ctx.answerCallbackQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.replyWithChatAction("upload_photo");
      const user = await getUser(userId);
      const params = buildSearchParams(user);
      const result = await searchImages(params);

      if (!result.items.length) {
        await ctx.reply("No images found.", {
          reply_markup: new InlineKeyboard().text(
            `${tr("btn_back_to_menu", ctx)}`,
            "cmd:main",
          ),
        });
        return;
      }

      if (result.items.length === 1) {
        const img = result.items[0];
        const fav = await isFavorited(userId, img.id);
        const caption = buildImageCaption(img, ctx);
        const kb = buildImageKb(img.id, fav, ctx);
        await replyWithMediaUniversal(ctx, user, img.url, {
          caption,
          reply_markup: kb,
          parse_mode: "Markdown",
        });
      } else {
        let text = `🎲 Random ${result.items.length} images:\n\n`;
        for (const img of result.items) {
          const artists =
            img.artists.map((a) => a.name).join(", ") || "Unknown";
          text += `• 🖼️ ID: ${img.id} | 🎨 ${artists}\n`;
        }
        const kb = new InlineKeyboard();
        for (const img of result.items) {
          kb.text(`🖼️ Image ${img.id}`, `img_detail:${img.id}`).row();
        }
        kb.text("🎲 More Random", `search_random:${mode}`).text(
          tr("btn_menu", ctx),
          "cmd:main",
        );
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (err) {
      logger.error("Search random error:", err);
      await ctx.reply("Failed to fetch image.", {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });
}

async function performSearch(ctx: Context, tags: string[], page: number) {
  await ctx.replyWithChatAction("upload_photo");
  const userId = ctx.from?.id!;
  const user = await getUser(userId);

  try {
    const params = buildSearchParams(user, { IncludedTags: tags, Page: page });
    const result = await searchImages(params);

    if (!result.items.length) {
      const noResult = "No images found for these tags.";
      const noKb = new InlineKeyboard().text(
        `${tr("btn_back_to_menu", ctx)}`,
        "cmd:main",
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

    const tagList = tags.join(", ");
    let text = `🔍 ${tr("search_results", ctx)} ${tagList}\n${tr("tags_page", ctx)} ${result.pageNumber}/${result.totalPages} (${result.totalCount} ${tr("tags_total", ctx)})\n\n`;

    for (const img of result.items) {
      const artists =
        img.artists.map((a) => a.name).join(", ") || tr("artist_unknown", ctx);
      const imgTags = img.tags.map((t) => t.name).join(", ");
      text += `🖼️ ${tr("image_id", ctx)}: ${img.id} | 🎨 ${artists} | 🏷️ ${imgTags}`;
      if (img.source)
        text += `\n  🔗 [${tr("image_source", ctx)}](${img.source})`;
      text += `\n`;
    }

    if (result.items.length === 1) {
      const img = result.items[0];
      const fav = await isFavorited(userId, img.id);
      const caption = buildImageCaption(img, ctx);
      const kb = buildImageKb(img.id, fav, ctx);
      await replyWithMediaUniversal(ctx, user, img.url, {
        caption,
        reply_markup: kb,
        parse_mode: "Markdown",
      });
    } else {
      const buttons = result.items.map((img) => [
        InlineKeyboard.text(`🖼️ Image ${img.id}`, `img_detail:${img.id}`),
      ]);
      const imgKb = InlineKeyboard.from(buttons);
      imgKb.row().text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");
      if (result.hasPreviousPage || result.hasNextPage) {
        imgKb.row();
        if (result.hasPreviousPage)
          imgKb.text(
            `◀️ ${tr("prev_page", ctx)}`,
            `search_page:${tags.join(",")}:${page - 1}`,
          );
        if (result.hasNextPage)
          imgKb.text(
            `▶️ ${tr("next_page", ctx)}`,
            `search_page:${tags.join(",")}:${page + 1}`,
          );
      }
      if (ctx.callbackQuery) {
        await ctx
          .editMessageText(text, {
            parse_mode: "Markdown",
            reply_markup: imgKb,
          })
          .catch(() =>
            ctx.reply(text, { parse_mode: "Markdown", reply_markup: imgKb }),
          );
      } else {
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: imgKb });
      }
    }
  } catch (err) {
    logger.error("Search error:", err);
    await ctx.reply(tr("search_no_results", ctx), {
      reply_markup: new InlineKeyboard().text(
        `${tr("btn_back_to_menu", ctx)}`,
        "cmd:main",
      ),
    });
  }
}
