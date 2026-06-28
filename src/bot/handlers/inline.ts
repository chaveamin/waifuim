import { Context } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getUser } from "../../db/queries.js";
import { buildSearchParams } from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";

export function registerInlineMode(bot: any) {
  bot.on("inline_query", async (ctx: Context) => {
    const query = ctx.inlineQuery?.query?.trim() || "";
    const offset = parseInt(ctx.inlineQuery?.offset || "0");
    const userId = ctx.from?.id;

    try {
      const tags = query
        ? query.split(/\s+/).map((t) => t.toLowerCase())
        : undefined;

      const user = userId ? await getUser(userId) : undefined;

      const params = buildSearchParams(user, {
        IncludedTags: tags,
        Page: Math.floor(offset / 5) + 1,
        PageSize: 5,
      });

      const result = await searchImages(params);

      const articles = result.items.map((img) => {
        const artists = img.artists.map((a) => a.name).join(", ") || "Unknown";
        const tagNames = img.tags.map((t) => t.name).join(", ");
        const caption =
          `🎨 ${artists}\n` +
          `🏷️ ${tagNames}\n` +
          `🖼️ ID: ${img.id} | ${img.width}x${img.height}` +
          (img.isAnimated ? " (GIF)" : "") +
          `\n❤️ ${img.favorites} favorites`;

        return {
          type: "photo" as const,
          id: String(img.id),
          photo_url: img.url,
          thumbnail_url: img.url,
          title: `🖼️ Image ${img.id}`,
          description: `🎨 ${artists} | 🏷️ ${tagNames}`,
          caption,
        };
      });

      const nextOffset = result.hasNextPage ? offset + 5 : "";

      await ctx.answerInlineQuery(articles, {
        next_offset: String(nextOffset),
        cache_time: 300,
      });
    } catch (err) {
      logger.error("Inline query error:", err);
      await ctx.answerInlineQuery([], { cache_time: 10 });
    }
  });
}
