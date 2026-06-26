import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  createAlbum,
  deleteAlbum,
  getUserAlbums,
  getAlbum,
  getAlbumByShareToken,
  addToAlbum,
  removeFromAlbum,
  getAlbumImages,
  getAlbumImageCount,
  getUserAlbumsContainingImage,
} from "../../db/queries.js";
import { getImageById } from "../../api/waifu.js";
import {
  buildImageCaption,
  buildMiniImageKb,
} from "../../utils/imageHelpers.js";
import { paginateArray } from "../../utils/formatters.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";

const createState = new Map<number, { step: "name" | "desc"; name?: string }>();
const addState = new Map<number, number>();
const removeState = new Map<number, number>();

export function registerAlbums(bot: any) {
  bot.command("albums", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showAlbums(ctx, userId);
  });

  bot.callbackQuery("albums:list", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showAlbums(ctx, userId);
  });

  bot.callbackQuery("albums:create", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    createState.set(userId, { step: "name" });
    const kb = new InlineKeyboard().text("❌ Cancel", "albums:list");
    await ctx.reply("📝 Send a name for your new album:", { reply_markup: kb });
  });

  bot.callbackQuery(/^album_view:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showAlbum(ctx, userId, albumId, 1);
  });

  bot.callbackQuery(/^album_page:(\d+):(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    const page = parseInt(ctx.match![2]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await showAlbum(ctx, userId, albumId, page);
  });

  bot.callbackQuery(/^album_img:(\d+):(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    const imageId = parseInt(ctx.match![2]);
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("upload_photo");

    try {
      const image = await getImageById(imageId);
      const caption = buildImageCaption(image, ctx);
      const { isFavorited } = await import("../../db/queries.js");
      const userId = ctx.from?.id!;
      const fav = await isFavorited(userId, imageId);
      const kb = buildMiniImageKb(imageId, fav);
      kb.row().text("🔙 Back to Album", `album_view:${albumId}`);
      await ctx.replyWithPhoto(image.url, {
        caption,
        reply_markup: kb,
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply("Image not found.", {
        reply_markup: new InlineKeyboard().text(
          "🔙 Back to Album",
          `album_view:${albumId}`,
        ),
      });
    }
  });

  bot.callbackQuery(/^album_add:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    addState.set(userId, albumId);
    const kb = new InlineKeyboard().text("❌ Cancel", `album_view:${albumId}`);
    await ctx.reply(
      `🖼️ Send an image ID to add to this album.\n\nExample: 1234`,
      { reply_markup: kb },
    );
  });

  bot.callbackQuery(/^album_remove:(\d+):(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    const imageId = parseInt(ctx.match![2]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await removeFromAlbum(albumId, imageId);
    const count = await getAlbumImageCount(albumId);
    const text =
      count === 0
        ? "Album is now empty."
        : `Removed image ${imageId} from album.`;
    await ctx.answerCallbackQuery({ text });
    await showAlbum(ctx, userId, albumId, 1);
  });

  bot.callbackQuery(/^album_del:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const album = await getAlbum(albumId);
    if (!album) {
      await ctx.reply("Album not found.");
      return;
    }
    const kb = new InlineKeyboard()
      .text("✅ Yes, delete", `album_delconfirm:${albumId}`)
      .text("❌ No, keep it", `album_view:${albumId}`);
    await ctx.reply(`🗑️ Delete album "${album.name}"? This cannot be undone.`, {
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^album_delconfirm:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await deleteAlbum(albumId);
    await ctx.answerCallbackQuery({ text: "🗑️ Album deleted." });
    await showAlbums(ctx, userId);
  });

  bot.callbackQuery(/^album_share:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const album = await getAlbum(albumId);
    if (!album || album.user_id !== userId) {
      await ctx.reply("Album not found.");
      return;
    }

    const botUsername = bot.botInfo?.username ?? "bot";
    const shareUrl = `https://t.me/${botUsername}?start=album_${album.share_token}`;

    const text =
      `🔗 Share Album\n\n` +
      `📁 ${album.name}\n` +
      `🔗 Link: ${shareUrl}\n\n` +
      `Anyone with this link can view your album.`;

    const kb = new InlineKeyboard()
      .url("📤 Share Link", shareUrl)
      .row()
      .text("🔙 Back to Album", `album_view:${albumId}`);

    await ctx.reply(text, { reply_markup: kb });
  });

  bot.callbackQuery(/^album_viewshared:([a-f0-9]+)$/, async (ctx: Context) => {
    const token = ctx.match![1];
    await ctx.answerCallbackQuery();
    await showSharedAlbum(ctx, token, 1);
  });

  bot.callbackQuery(
    /^album_sharedpage:([a-f0-9]+):(\d+)$/,
    async (ctx: Context) => {
      const token = ctx.match![1];
      const page = parseInt(ctx.match![2]);
      await ctx.answerCallbackQuery();
      await showSharedAlbum(ctx, token, page);
    },
  );

  bot.callbackQuery(/^album_copy:(\d+)$/, async (ctx: Context) => {
    const sourceAlbumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const sourceAlbum = await getAlbum(sourceAlbumId);
    if (!sourceAlbum) {
      await ctx.reply("Album not found.");
      return;
    }

    const newAlbumId = await createAlbum(
      userId,
      `Copy of ${sourceAlbum.name}`,
      sourceAlbum.description,
    );
    const images = await getAlbumImages(sourceAlbumId, 100, 0);
    let copied = 0;
    for (const img of images) {
      if (await addToAlbum(newAlbumId, img.image_id)) copied++;
    }

    const kb = new InlineKeyboard()
      .text("📋 View My Copy", `album_view:${newAlbumId}`)
      .text("📚 My Albums", "albums:list");

    await ctx.reply(
      `✅ Copied ${copied} images to your new album "${sourceAlbum.name}"!`,
      {
        reply_markup: kb,
      },
    );
  });

  bot.callbackQuery(/^pick_album:(\d+)$/, async (ctx: Context) => {
    const imageId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const albums = await getUserAlbums(userId);
    if (!albums.length) {
      const kb = new InlineKeyboard()
        .text("➕ Create Album", "albums:create")
        .text("📚 My Albums", "albums:list");
      await ctx.reply("No albums yet. Create one first!", { reply_markup: kb });
      return;
    }

    let text = `📚 Add image #${imageId} to album:\n\n`;
    const kb = new InlineKeyboard();
    for (const a of albums) {
      kb.text(
        `📁 ${a.name} (${a.image_count})`,
        `album_quickadd:${a.id}:${imageId}`,
      ).row();
    }
    kb.text("➕ Create New Album", "albums:create").row();
    kb.text("❌ Cancel", "cmd:main");

    await ctx.reply(text, { reply_markup: kb });
  });

  bot.callbackQuery(/^album_quickadd:(\d+):(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    const imageId = parseInt(ctx.match![2]);
    await ctx.answerCallbackQuery();

    const added = await addToAlbum(albumId, imageId);
    const album = await getAlbum(albumId);
    const name = album?.name ?? "album";

    if (added) {
      await ctx.answerCallbackQuery({ text: `✅ Added to "${name}"!` });
    } else {
      await ctx.answerCallbackQuery({ text: `Already in "${name}".` });
    }
  });

  bot.on("message:text", async (ctx: Context, next: () => void) => {
    const userId = ctx.from?.id;
    if (!userId || !ctx.message?.text) return next();

    const create = createState.get(userId);
    if (create) {
      const text = ctx.message.text;
      if (text.startsWith("/")) return next();

      if (create.step === "name") {
        if (text.length > 50) {
          await ctx.reply("Name too long. Max 50 characters. Try again:");
          return;
        }
        create.name = text;
        create.step = "desc";
        const kb = new InlineKeyboard()
          .text("Skip", "albums:skipdesc")
          .text("❌ Cancel", "albums:list");
        await ctx.reply(`📝 Now send a description for "${text}" (or skip):`, {
          reply_markup: kb,
        });
        return;
      }

      if (create.step === "desc") {
        createState.delete(userId);
        const albumId = await createAlbum(userId, create.name!, text);
        const kb = new InlineKeyboard()
          .text("➕ Add Images", `album_add:${albumId}`)
          .text("📋 View Album", `album_view:${albumId}`)
          .row()
          .text("📚 My Albums", "albums:list");
        await ctx.reply(`✅ Album "${create.name}" created!`, {
          reply_markup: kb,
        });
        return;
      }
    }

    const addAlbumId = addState.get(userId);
    if (addAlbumId) {
      const text = ctx.message.text;
      if (text.startsWith("/")) return next();

      addState.delete(userId);
      const imageId = parseInt(text);
      if (isNaN(imageId)) {
        await ctx.reply("Invalid image ID. Use a number.", {
          reply_markup: new InlineKeyboard().text(
            "🔙 Back to Album",
            `album_view:${addAlbumId}`,
          ),
        });
        return;
      }

      const added = await addToAlbum(addAlbumId, imageId);
      if (added) {
        await ctx.answerCallbackQuery({
          text: `✅ Added image ${imageId} to album!`,
        });
      } else {
        await ctx.answerCallbackQuery({
          text: `Image ${imageId} is already in this album.`,
        });
      }
      await showAlbum(ctx, userId, addAlbumId, 1);
      return;
    }

    return next();
  });

  bot.callbackQuery("albums:skipdesc", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    const create = createState.get(userId);
    if (!create || !create.name) {
      createState.delete(userId);
      return;
    }
    createState.delete(userId);
    const albumId = await createAlbum(userId, create.name, "");
    const kb = new InlineKeyboard()
      .text("➕ Add Images", `album_add:${albumId}`)
      .text("📋 View Album", `album_view:${albumId}`)
      .row()
      .text("📚 My Albums", "albums:list");
    await ctx.reply(`✅ Album "${create.name}" created!`, { reply_markup: kb });
  });
}

async function showAlbums(ctx: Context, telegramId: number) {
  const albums = await getUserAlbums(telegramId);

  if (!albums.length) {
    const kb = new InlineKeyboard()
      .text("➕ Create Album", "albums:create")
      .row()
      .text(`🏠 ${tr("btn_back_to_menu", ctx)}`, "cmd:main");
    const text =
      "📚 No albums yet.\n\nCreate albums to organize your favorite images into themed collections!";
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(text, { reply_markup: kb })
        .catch(() => ctx.reply(text, { reply_markup: kb }));
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
    return;
  }

  let text = `📚 Your Albums (${albums.length})\n\n`;
  for (const a of albums) {
    text += `📁 ${a.name} — ${a.image_count} images\n`;
    if (a.description) text += `   ${a.description}\n`;
  }

  const kb = new InlineKeyboard();
  for (const a of albums) {
    kb.text(`📁 ${a.name} (${a.image_count})`, `album_view:${a.id}`).row();
  }
  kb.text("➕ Create New Album", "albums:create").row();
  kb.text(`🏠 ${tr("btn_back_to_menu", ctx)}`, "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showAlbum(
  ctx: Context,
  telegramId: number,
  albumId: number,
  page: number,
) {
  const album = await getAlbum(albumId);
  if (!album || album.user_id !== telegramId) {
    await ctx.reply("Album not found.", {
      reply_markup: new InlineKeyboard().text("📚 My Albums", "albums:list"),
    });
    return;
  }

  const perPage = 5;
  const total = await getAlbumImageCount(albumId);
  const images = await getAlbumImages(albumId, perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  let text = `📁 ${album.name}`;
  if (album.description) text += `\n📝 ${album.description}`;
  text += `\n📊 ${total} images — Page ${page}/${totalPages || 1}\n`;

  if (!images.length) {
    text += `\n(empty — add images to get started)`;
  } else {
    for (const img of images) {
      text += `\n• 🖼️ Image #${img.image_id}`;
    }
  }

  const kb = new InlineKeyboard();
  for (const img of images) {
    kb.text(
      `🖼️ Image ${img.image_id}`,
      `album_img:${albumId}:${img.image_id}`,
    ).row();
    kb.text(`  ❌ Remove`, `album_remove:${albumId}:${img.image_id}`).row();
  }

  kb.row()
    .text("➕ Add Image", `album_add:${albumId}`)
    .text("🗑️ Delete Album", `album_del:${albumId}`);
  kb.row().text("🔗 Share Album", `album_share:${albumId}`);
  if (totalPages > 1) {
    kb.row();
    if (page > 1) kb.text("◀️ Prev", `album_page:${albumId}:${page - 1}`);
    if (page < totalPages)
      kb.text("▶️ Next", `album_page:${albumId}:${page + 1}`);
  }
  kb.row().text("📚 All Albums", "albums:list").text("🏠 Menu", "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showSharedAlbum(ctx: Context, token: string, page: number) {
  const album = await getAlbumByShareToken(token);
  if (!album) {
    await ctx.reply("Album not found or link expired.", {
      reply_markup: new InlineKeyboard().text("🏠 Menu", "cmd:main"),
    });
    return;
  }

  const owner = await (
    await import("../../db/queries.js")
  ).getUser(album.user_id);
  const ownerName = owner?.username
    ? `@${owner.username}`
    : owner?.first_name || "Unknown";

  const perPage = 5;
  const total = await getAlbumImageCount(album.id);
  const images = await getAlbumImages(album.id, perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  let text = `🔗 Shared Album\n\n`;
  text += `📁 ${album.name}`;
  if (album.description) text += `\n📝 ${album.description}`;
  text += `\n👤 Owner: ${ownerName}`;
  text += `\n📊 ${total} images — Page ${page}/${totalPages || 1}\n`;

  if (!images.length) {
    text += `\n(empty)`;
  } else {
    for (const img of images) {
      text += `\n• 🖼️ Image #${img.image_id}`;
    }
  }

  const kb = new InlineKeyboard();
  for (const img of images) {
    kb.text(
      `🖼️ Image ${img.image_id}`,
      `album_img:${album.id}:${img.image_id}`,
    ).row();
  }
  kb.text("📋 Copy to My Albums", `album_copy:${album.id}`).row();
  if (totalPages > 1) {
    if (page > 1) kb.text("◀️ Prev", `album_sharedpage:${token}:${page - 1}`);
    if (page < totalPages)
      kb.text("▶️ Next", `album_sharedpage:${token}:${page + 1}`);
  }
  kb.row().text("📚 My Albums", "albums:list").text("🏠 Menu", "cmd:main");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

export function getAlbumAddState() {
  return addState;
}
