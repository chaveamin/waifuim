import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getTags, searchImages } from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import { paginateArray } from "../../utils/formatters.js";
import {
  buildImageCaption,
  buildImageKb,
  buildSearchParams,
} from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";

export function registerTags(bot: any) {
  bot.command("tags", async (ctx: Context) => {
    try {
      const tags = await getTags();
      const chatId = ctx.chat?.id;
      const msgId = ctx.message?.message_id;
      if (!chatId || !msgId) return;

      await ctx.reply("🏷️ Loading tags...");
      showTagsPage(ctx, tags, 1, chatId, msgId);
    } catch (err) {
      logger.error("Tags error:", err);
      await ctx.reply("Failed to fetch tags.", {
        reply_markup: new InlineKeyboard().text(
          `🏠 ${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });

  bot.callbackQuery(/^tags_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();

    try {
      const tags = await getTags();
      const msg = ctx.callbackQuery?.message;
      const chatId = msg?.chat.id;
      const msgId = msg?.message_id;
      if (!chatId || !msgId) return;

      showTagsPage(ctx, tags, page, chatId, msgId);
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
          const kb = buildImageKb(img.id, fav);
          await ctx.replyWithPhoto(img.url, {
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
          kb.text("🏷️ More Tags", "cmd:tags").text("🏠 Menu", "cmd:main");
          await ctx.reply(text, { reply_markup: kb });
        }
      } else {
        await ctx.reply(`No images found for tag: ${tagName}`, {
          reply_markup: new InlineKeyboard().text(
            `🏠 ${tr("btn_back_to_menu", ctx)}`,
            "cmd:main",
          ),
        });
      }
    } catch {
      await ctx.reply("Failed to search tag.", {
        reply_markup: new InlineKeyboard().text(
          `🏠 ${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });
}

function showTagsPage(
  _ctx: Context,
  tags: any[],
  page: number,
  chatId: number,
  msgId: number,
) {
  const { items, totalPages } = paginateArray(tags, page, 20);
  let text = `🏷️ Tags (Page ${page}/${totalPages}, ${tags.length} total):\n\n`;
  for (const tag of items) {
    text += `• ${tag.name}\n`;
  }

  const kb = new InlineKeyboard();
  for (const tag of items) {
    kb.text(`🏷️ ${tag.name}`, `search_tag:${tag.slug}`).row();
  }
  kb.row().text(`🏠 ${tr("btn_back_to_menu", _ctx)}`, "cmd:main");
  if (totalPages > 1) {
    if (page > 1) kb.text("◀️ Prev", `tags_page:${page - 1}`);
    if (page < totalPages) kb.text("▶️ Next", `tags_page:${page + 1}`);
  }

  _ctx.api
    .editMessageText(chatId, msgId, text, { reply_markup: kb })
    .catch(() => {});
}
