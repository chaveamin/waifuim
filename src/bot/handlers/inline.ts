import { Context } from "grammy";
import { searchImages, getAllTags } from "../../api/waifu.js";
import { logger } from "../../utils/logger.js";

export function registerInlineMode(bot: any) {
  bot.on("inline_query", async (ctx: Context) => {
    const query = ctx.inlineQuery?.query?.trim() || "";
    const offset = parseInt(ctx.inlineQuery?.offset || "0");

    try {
      let tags: string[] = [];
      if (query) {
        const allTags = await getAllTags();
        const words = query.split(/\s+/);
        for (const word of words) {
          const lower = word.toLowerCase();
          const match = allTags.find(
            (t) =>
              t.slug.toLowerCase() === lower || t.name.toLowerCase() === lower,
          );
          if (match) {
            tags.push(match.slug);
          } else {
            const partial = allTags.find(
              (t) =>
                t.slug.toLowerCase().includes(lower) ||
                t.name.toLowerCase().includes(lower),
            );
            if (partial) tags.push(partial.slug);
          }
        }
      }

      const result = await searchImages({
        IncludedTags: tags.length ? tags : undefined,
        IsNsfw: "False",
        Page: Math.floor(offset / 5) + 1,
        PageSize: 5,
      });

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
