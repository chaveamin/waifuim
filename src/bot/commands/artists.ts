import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getArtists, searchImages } from "../../api/waifu.js";
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
import { getPatreonArtists, getPatreonFiles } from "../../data/patreonFiles.js";

const searchState = new Map<number, boolean>();

export function registerArtists(bot: any) {
  bot.command("artists", async (ctx: Context) => {
    try {
      const artists = await getArtists();
      await showArtistsPage(ctx, artists, 1);
    } catch (err) {
      logger.error(tr("artist_err", ctx), err);
      await ctx.reply(tr("artists_failed", ctx), {
        reply_markup: new InlineKeyboard().text(
          tr("btn_back_to_menu", ctx),
          "cmd:main",
        ),
      });
    }
  });

  bot.callbackQuery(/^artists_page:(\d+)$/, async (ctx: Context) => {
    const page = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    try {
      const artists = await getArtists();
      await showArtistsPage(ctx, artists, page);
    } catch (err) {
      logger.error(tr("artist_pageerr", ctx), err);
    }
  });

  bot.callbackQuery(/^artist_images:(\d+)$/, async (ctx: Context) => {
    const artistId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");
    const userId = ctx.from?.id!;
    const user = await getUser(userId);

    try {
      const artists = await getArtists();
      const artist = artists.find((a) => a.id === artistId);
      const artistName = artist?.name;

      const params = buildSearchParams(user, { IncludedArtists: [artistId] });
      const result = await searchImages(params);

      if (result.items.length) {
        if (result.items.length === 1) {
          const img = result.items[0];
          const fav = await isFavorited(userId, img.id);
          const caption = buildImageCaption(img, ctx);
          const kb = buildImageKb(img.id, fav, ctx, artistId, artistName);
          await replyWithMediaUniversal(ctx, user, img.url, {
            caption,
            reply_markup: kb,
            parse_mode: "Markdown",
          });
        } else {
          let text = `${artistName ?? `Artist #${artistId}`} - ${result.items.length} ${tr("group_images", ctx)}:\n\n`;
          for (const img of result.items) {
            const imgTags = img.tags.map((t) => t.name).join(", ");
            text += `• ${img.id} | ${imgTags}\n`;
          }
          const kb = new InlineKeyboard();
          for (const img of result.items) {
            kb.text(
              `${tr("group_images", ctx)} ${img.id}`,
              `img_detail:${img.id}`,
            ).row();
          }
          kb.text(
            `${tr("artist_another", ctx)} ${artistName ?? "Artist"}`,
            `artist_random:${artistId}`,
          ).row();
          kb.text(tr("artist_back", ctx), "cmd:artists").text(
            tr("btn_menu", ctx),
            "cmd:main",
          );
          await ctx.reply(text, { reply_markup: kb });
        }
      } else {
        await ctx.reply(tr("artist_no_images", ctx), {
          reply_markup: new InlineKeyboard().text(
            `${tr("btn_back_to_menu", ctx)}`,
            "cmd:main",
          ),
        });
      }
    } catch {
      await ctx.reply(tr("artists_img_failed", ctx), {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });

  bot.callbackQuery(/^artist_random:(\d+)$/, async (ctx: Context) => {
    const artistId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");
    const userId = ctx.from?.id!;
    const user = await getUser(userId);

    try {
      const artists = await getArtists();
      const artist = artists.find((a) => a.id === artistId);

      const params = buildSearchParams(user, {
        IncludedArtists: [artistId],
        PageSize: 1,
      });
      const result = await searchImages(params);

      if (!result.items.length) {
        await ctx.reply(tr("artists_imgs_end", ctx), {
          reply_markup: new InlineKeyboard().text(
            `${tr("btn_back_to_menu", ctx)}`,
            "cmd:main",
          ),
        });
        return;
      }

      const img = result.items[0];
      const fav = await isFavorited(userId, img.id);
      const caption = buildImageCaption(img, ctx);
      const kb = buildImageKb(img.id, fav, ctx, artistId, artist?.name);
      await replyWithMediaUniversal(ctx, user, img.url, {
        caption,
        reply_markup: kb,
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply(tr("random_failed", ctx), {
        reply_markup: new InlineKeyboard().text(
          `${tr("btn_back_to_menu", ctx)}`,
          "cmd:main",
        ),
      });
    }
  });

  bot.callbackQuery(/^patreon_artist:(\d+)$/, async (ctx: Context) => {
    const artistId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await showPatreonArtistDetail(ctx, artistId);
  });

  bot.callbackQuery(/^patreon_file:(\d+):(\d+)$/, async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const artistId = parseInt(ctx.match![1]);
    const fileIndex = parseInt(ctx.match![2]);
    await sendPatreonFile(ctx, artistId, fileIndex);
  });

  bot.callbackQuery("artists:search", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    searchState.set(userId, true);
    const kb = new InlineKeyboard().text(tr("btn_cancel", ctx), "cmd:artists");
    await ctx.reply(tr("artists_search_prompt", ctx), { reply_markup: kb });
  });

  bot.callbackQuery(/^artist_name:(.+)$/, async (ctx: Context) => {
    const name = decodeURIComponent(ctx.match![1]);
    await ctx.answerCallbackQuery();
    await searchArtistByName(ctx, name);
  });

  bot.on("message:text", async (ctx: Context, next: () => void) => {
    const userId = ctx.from?.id;
    if (!userId || !ctx.message?.text) return next();

    if (searchState.get(userId)) {
      searchState.delete(userId);
      const text = ctx.message.text;
      if (text.startsWith("/")) return next();
      await searchArtistByName(ctx, text);
      return;
    }
    return next();
  });
}

async function searchArtistByName(ctx: Context, query: string) {
  await ctx.replyWithChatAction("typing");

  try {
    const artists = await getArtists(query);
    const matching = artists.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (!matching.length) {
      await ctx.reply(tr("inline_no_results", ctx), {
        reply_markup: new InlineKeyboard()
          .text(tr("artist_back", ctx), "cmd:artists")
          .text(tr("btn_menu", ctx), "cmd:main"),
      });
      return;
    }

    let text = `${tr("artist_found", ctx)} "${query}" (${matching.length} ${tr("found", ctx)}):\n\n`;
    for (const a of matching.slice(0, 15)) {
      text += `• ${a.name} (${tr("image_id", ctx)}: ${a.id})\n`;
    }

    const kb = new InlineKeyboard();
    for (const a of matching.slice(0, 15)) {
      kb.text(`${a.name}`, `artist_images:${a.id}`).row();
    }
    kb.row().text(tr("btn_search_artist", ctx), "artists:search");
    kb.text(tr("artist_back", ctx), "cmd:artists").text(
      tr("btn_menu", ctx),
      "cmd:main",
    );

    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(text, { reply_markup: kb })
        .catch(() => ctx.reply(text, { reply_markup: kb }));
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
  } catch (err) {
    logger.error(tr("artist_searcherr", ctx), err);
    await ctx.reply(tr("artist_search_faild", ctx), {
      reply_markup: new InlineKeyboard().text(
        `${tr("btn_back_to_menu", ctx)}`,
        "cmd:main",
      ),
    });
  }
}

export async function showPatreonArtistsPage(ctx: Context) {
  const artists = getPatreonArtists();
  if (!artists.length) {
    await ctx.reply(tr("patreon_no_files", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  let text = `${tr("btn_patreon_artists", ctx)}\n\n`;
  const kb = new InlineKeyboard();

  for (const artist of artists) {
    kb.text(`${artist.artistName}`, `patreon_artist:${artist.artistId}`).row();
  }

  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");
  await ctx.reply(text, { reply_markup: kb });
}

async function showPatreonArtistDetail(ctx: Context, artistId: number) {
  const files = getPatreonFiles(artistId);
  if (!files.length) {
    await ctx.reply(tr("patreon_no_files", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  const artistEntry = files[0];

  // Build caption containing only metadata (no artist name, no file count)
  let caption = "";
  if (artistEntry.artistDescription) caption += `${artistEntry.artistDescription}\n\n`;
  if (artistEntry.patreonLink) caption += `Patreon: ${artistEntry.patreonLink}\n`;
  if (artistEntry.genres && artistEntry.genres.length)
    caption += `Genres: ${artistEntry.genres.join(", ")}\n`;

  // Truncate caption to Telegram limit (1024 chars)
  if (caption.length > 1024) caption = caption.slice(0, 1020) + "...";

  // Build keyboard and file buttons
  const kb = new InlineKeyboard();
  for (const [index, file] of files.entries()) {
    const buttonText = file.title
      ? file.title
      : file.fileName
        ? `${tr("btn_receive_file", ctx)} ${file.fileName}`
        : `${tr("btn_receive_file", ctx)} ${index + 1}`;
    kb.text(buttonText, `patreon_file:${artistId}:${index}`).row();
  }
  kb.text(tr("artist_back", ctx), "cmd:patreon_artists").text(
    tr("btn_menu", ctx),
    "cmd:main",
  );

  // Send only the first preview with caption and keyboard (no extra messages)
  try {
    const chatId = ctx.chat?.id ?? ctx.from?.id;
    if (
      artistEntry.previewImages &&
      artistEntry.previewImages.length &&
      chatId
    ) {
      const normalize = (url: string) => url.replace(/\.avif(\?.*)?$/i, ".jpg");
      const first = normalize(artistEntry.previewImages[0]);
      await ctx.replyWithPhoto(first, { caption, reply_markup: kb });
      return; // do not send any other messages
    }
  } catch (err) {
    logger.warn("Failed to send preview image:", err);
  }

  // Fallback: if no preview exists or sending failed, send caption text with keyboard as single message
  const fallbackText = caption || tr("patreon_no_files", ctx);
  try {
    await ctx.reply(fallbackText, { reply_markup: kb });
  } catch (err) {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(fallbackText, { reply_markup: kb }).catch(() => {});
    }
  }
}

async function sendPatreonFile(
  ctx: Context,
  artistId: number,
  fileIndex: number,
) {
  const files = getPatreonFiles(artistId);
  const file = files[fileIndex];
  if (!file) {
    await ctx.reply(tr("patreon_send_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  try {
    const chatId = ctx.chat?.id ?? ctx.from?.id;
    if (!chatId) throw new Error("Missing chat id");

    if (file.fileId) {
      await ctx.replyWithDocument(file.fileId);
    } else if ((file.channelId || file.channelUsername) && file.messageId) {
      // Prefer numeric channelId for private channels; fall back to channelUsername for public channels
      const sourceChat = (file.channelId ?? file.channelUsername) as string;
      await ctx.api.copyMessage(chatId, sourceChat, file.messageId);
    } else {
      throw new Error("No file source configured");
    }

    await ctx.answerCallbackQuery({
      text: tr("patreon_file_sent", ctx),
      show_alert: false,
    });
  } catch (err) {
    logger.error("Patreon file send error:", err);
    await ctx.reply(tr("patreon_send_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

export async function showArtistsPage(
  ctx: Context,
  artists: any[],
  page: number,
) {
  const { items, totalPages } = paginateArray(artists, page, 15);
  let text = `${tr("btn_artists", ctx)} (${tr("tags_page", ctx)} ${page}/${totalPages}, ${artists.length} ${tr("tags_total", ctx)}):\n\n`;
  for (const artist of items) {
    text += `${artist.name} (${tr("image_id", ctx)}: ${artist.id})\n`;
  }

  const kb = new InlineKeyboard();
  for (const artist of items) {
    kb.text(`${artist.name}`, `artist_images:${artist.id}`).row();
  }

  kb.row().text(tr("btn_search_artist", ctx), "artists:search");
  if (totalPages > 1) {
    kb.row();
    if (page > 1)
      kb.text(`${tr("prev_page", ctx)}`, `artists_page:${page - 1}`);
    if (page < totalPages)
      kb.text(`${tr("next_page", ctx)}`, `artists_page:${page + 1}`);
  }
  kb.row().text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
