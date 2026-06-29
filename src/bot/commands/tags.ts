import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getAllTags, searchImages } from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import { paginateArray } from "../../utils/formatters.js";
import {
  buildImageCaption,
  buildImageKb,
  buildSearchParams,
} from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";
import { replyWithMediaUniversal } from "../../utils/imageHelpers.js";

export function registerTags(bot: any) {
  bot.command("tags", async (ctx: Context) => {
    try {
      const tags = await getAllTags();
      await showTagsPage(ctx, tags, 1);
    } catch (err) {
      logger.error("Tags error:", err);
      await ctx.reply(tr("tags_failed", ctx), {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });

  bot.callbackQuery(/^tags_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    try {
      const tags = await getAllTags();
      await showTagsPage(ctx, tags, page);
    } catch (err) {
      logger.error("Tags page error:", err);
    }
  });

  bot.callbackQuery(/^tag_search:(.+)$/, async (ctx: Context) => {
    const tagName = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");
    const userId = ctx.from?.id!;
    const user = await getUser(userId);

    try {
      const params = buildSearchParams(user, { IncludedTags: [tagName] });
      const result = await searchImages(params);

      if (result.items.length) {
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
          let text = `🏷️ Tag: ${tagName} — ${result.items.length} images:\n\n`;
          for (const img of result.items) {
            const artists =
              img.artists.map((a) => a.name).join(", ") || "Unknown";
            text += `• 🖼️ ID: ${img.id} | 🎨 ${artists}\n`;
          }
          const kb = new InlineKeyboard();
          for (const img of result.items) {
            kb.text(`🖼️ Image ${img.id}`, `img_detail:${img.id}`).row();
          }
          kb.text("🏷️ More Tags", "cmd:tags").text(
            tr("btn_menu", ctx),
            "cmd:main",
          );
          await ctx.reply(text, { reply_markup: kb });
        }
      } else {
        await ctx.reply(`No images found for tag: ${tagName}`, {
          reply_markup: new InlineKeyboard().text(
            `${tr("btn_back_to_menu", ctx)}`,
            "cmd:main",
          ),
        });
      }
    } catch {
      await ctx.reply("Failed to search tag.", {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });
}

async function showTagsPage(ctx: Context, tags: any[], page: number) {
  const { items, totalPages } = paginateArray(tags, page, 20);
  let text = `${tr("tags_title", ctx)} (${tr("tags_page", ctx)} ${page}/${totalPages}, ${tags.length} ${tr("tags_total", ctx)}):\n\n`;
  for (const tag of items) {
    text += `${tag.name}\n`;
  }

  const kb = new InlineKeyboard();
  for (const tag of items) {
    kb.text(`🏷️ ${tag.name}`, `search_tag:${tag.slug}`).row();
  }
  kb.row().text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");

  if (totalPages > 1) {
    if (page > 1) kb.text(`${tr("prev_page", ctx)}`, `tags_page:${page - 1}`);
    if (page < totalPages)
      kb.text(`${tr("next_page", ctx)}`, `tags_page:${page + 1}`);
  }

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
