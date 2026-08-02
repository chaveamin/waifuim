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
  getUser,
} from "../../db/queries.js";
import { getImageById } from "../../api/waifu.js";
import {
  buildImageCaption,
  buildMiniImageKb,
} from "../../utils/imageHelpers.js";
import { tr } from "../../i18n/index.js";
import { replyWithMediaUniversal } from "../../utils/imageHelpers.js";

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
    const kb = new InlineKeyboard().text(tr("album_list", ctx), "albums:list");
    await ctx.reply(tr("albums_create_title", ctx), { reply_markup: kb });
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
      const user = await getUser(userId);
      const fav = await isFavorited(userId, imageId);
      const kb = buildMiniImageKb(imageId, fav, ctx);
      kb.row().text(tr("albums_back", ctx), `album_view:${albumId}`);
      await replyWithMediaUniversal(ctx, user, image.url, {
        caption,
        reply_markup: kb,
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply(tr("album_img_not_found", ctx), {
        reply_markup: new InlineKeyboard().text(
          tr("albums_back", ctx),
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
    const kb = new InlineKeyboard().text(
      tr("btn_view_album", ctx),
      `album_view:${albumId}`,
    );
    await ctx.reply(`${tr("btn_search_artist_again", ctx)}`, {
      reply_markup: kb,
    });
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
        ? tr("albums_empty_text", ctx)
        : `${tr("album_image", ctx)} ${imageId} ${tr("album_image_removed", ctx)}`;
    await ctx.answerCallbackQuery({ text });
    await showAlbum(ctx, userId, albumId, 1);
  });

  bot.callbackQuery(/^album_del:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const album = await getAlbum(albumId);
    if (!album) {
      await ctx.reply(tr("album_notfound", ctx));
      return;
    }
    const kb = new InlineKeyboard()
      .text(tr("btn_confirm", ctx), `album_delconfirm:${albumId}`)
      .text(tr("btn_keep", ctx), `album_view:${albumId}`);
    await ctx.reply(tr("albums_delete_confirm", ctx), {
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^album_delconfirm:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await deleteAlbum(albumId);
    await ctx.answerCallbackQuery({ text: tr("albums_deleted", ctx) });
    await showAlbums(ctx, userId);
  });

  bot.callbackQuery(/^album_share:(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const album = await getAlbum(albumId);
    if (!album || album.user_id !== userId) {
      await ctx.reply(tr("album_notfound", ctx));
      return;
    }

    const botUsername = bot.botInfo?.username ?? "bot";
    const shareUrl = `https://t.me/${botUsername}?start=album_${album.share_token}`;

    const text =
      `${tr("btn_share_album", ctx)}\n\n` +
      `${album.name}\n` +
      `${tr("btn_share_album_link", ctx)} ${shareUrl}\n\n` +
      `${tr("albums_share_desc", ctx)}`;

    const kb = new InlineKeyboard()
      .url(tr("albums_share_linkbtn", ctx), shareUrl)
      .row()
      .text(tr("albums_back", ctx), `album_view:${albumId}`);

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
      await ctx.reply(tr("album_notfound", ctx));
      return;
    }

    const newAlbumId = await createAlbum(
      userId,
      `${tr("btn_copy", ctx)} ${sourceAlbum.name}`,
      sourceAlbum.description,
    );
    const images = await getAlbumImages(sourceAlbumId, 100, 0);
    let copied = 0;
    for (const img of images) {
      if (await addToAlbum(newAlbumId, img.image_id)) copied++;
    }

    const kb = new InlineKeyboard()
      .text(tr("lb_albums_copy_view", ctx), `album_view:${newAlbumId}`)
      .text(tr("btn_my_albums", ctx), "albums:list");

    await ctx.reply(`tr("albums_copied", ctx) "${sourceAlbum.name}"`, {
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^pick_album:(\d+)$/, async (ctx: Context) => {
    const imageId = parseInt(ctx.match![1]);
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const albums = await getUserAlbums(userId);
    if (!albums.length) {
      const kb = new InlineKeyboard()
        .text(tr("album_new", ctx), "albums:create")
        .text(tr("btn_my_albums", ctx), "albums:list");
      await ctx.reply(tr("albums_no_albums", ctx), { reply_markup: kb });
      return;
    }

    let text = `${tr("albums_pick_1", ctx)} #${imageId} ${tr("albums_pick_2", ctx)}\n\n`;
    const kb = new InlineKeyboard();
    for (const a of albums) {
      kb.text(
        `${a.name} (${a.image_count})`,
        `album_quickadd:${a.id}:${imageId}`,
      ).row();
    }
    kb.text(tr("album_new", ctx), "albums:create").row();
    kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

    await ctx.reply(text, { reply_markup: kb });
  });

  bot.callbackQuery(/^album_quickadd:(\d+):(\d+)$/, async (ctx: Context) => {
    const albumId = parseInt(ctx.match![1]);
    const imageId = parseInt(ctx.match![2]);

    const added = await addToAlbum(albumId, imageId);
    const album = await getAlbum(albumId);
    const name = album?.name ?? "album";

    if (added) {
      await ctx.answerCallbackQuery({
        text: `${tr("album_add_success", ctx)} "${name}"`,
      });
    } else {
      await ctx.answerCallbackQuery({ text: tr("album_add_exists", ctx) });
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    const albums = await getUserAlbums(userId);

    const kb = new InlineKeyboard();
    for (const a of albums) {
      const prefix = a.id === albumId ? "✅" : "";
      kb.text(
        `${prefix} ${a.name} (${a.image_count})`,
        `album_quickadd:${a.id}:${imageId}`,
      ).row();
    }
    kb.text(tr("album_new", ctx), "albums:create").row();
    kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

    await ctx.editMessageReplyMarkup({ reply_markup: kb }).catch(() => {});
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
          await ctx.reply(tr("albums_name_long", ctx));
          return;
        }
        create.name = text;
        create.step = "desc";
        const kb = new InlineKeyboard()
          .text(tr("btn_skip", ctx), "albums:skipdesc")
          .text(tr("album_list", ctx), "albums:list");
        await ctx.reply(`${tr("albums_desc_prompt", ctx)} "${text}"`, {
          reply_markup: kb,
        });
        return;
      }

      if (create.step === "desc") {
        createState.delete(userId);
        const albumId = await createAlbum(userId, create.name!, text);
        const kb = new InlineKeyboard()
          .text(tr("album_add_images", ctx), `album_add:${albumId}`)
          .text(tr("btn_view_album", ctx), `album_view:${albumId}`)
          .row()
          .text(tr("btn_my_albums", ctx), "albums:list");
        await ctx.reply(tr("albums_created", ctx), {
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
        await ctx.reply(tr("albums_add_invalid", ctx), {
          reply_markup: new InlineKeyboard().text(
            tr("albums_back", ctx),
            `album_view:${addAlbumId}`,
          ),
        });
        return;
      }

      const added = await addToAlbum(addAlbumId, imageId);
      if (added) {
        await ctx.reply(
          `${tr("albums_pick_1", ctx)} ${imageId} ${tr("albums_pick_2", ctx)}`,
        );
      } else {
        await ctx.reply(tr("album_add_exists", ctx));
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
      .text(tr("album_add_images", ctx), `album_add:${albumId}`)
      .text(tr("btn_view_album", ctx), `album_view:${albumId}`)
      .row()
      .text(tr("btn_my_albums", ctx), "albums:list");
    await ctx.reply(tr("albums_created", ctx), { reply_markup: kb });
  });
}

async function showAlbums(ctx: Context, telegramId: number) {
  const albums = await getUserAlbums(telegramId);

  if (!albums.length) {
    const kb = new InlineKeyboard()
      .text(tr("album_new", ctx), "albums:create")
      .row()
      .text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");
    const text = tr("albums_empty", ctx);
    if (ctx.callbackQuery) {
      await ctx
        .editMessageText(text, { reply_markup: kb })
        .catch(() => ctx.reply(text, { reply_markup: kb }));
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
    return;
  }

  let text = `${tr("albums_title", ctx)} (${albums.length})\n\n`;
  for (const a of albums) {
    text += `${a.name} — ${a.image_count} ${tr("images", ctx)}\n`;
    if (a.description) text += `   ${a.description}\n`;
  }

  const kb = new InlineKeyboard();
  for (const a of albums) {
    kb.text(`${a.name} (${a.image_count})`, `album_view:${a.id}`).row();
  }
  kb.text(tr("album_new", ctx), "albums:create").row();
  kb.text(`${tr("btn_back_to_menu", ctx)}`, "cmd:main");

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
    await ctx.reply(tr("album_notfound", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_my_albums", ctx),
        "albums:list",
      ),
    });
    return;
  }

  const perPage = 5;
  const total = await getAlbumImageCount(albumId);
  const images = await getAlbumImages(albumId, perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  let text = `${album.name}`;
  if (album.description) text += `\n${album.description}`;
  text += `\n${total} ${tr("images", ctx)} — ${tr("fav_page", ctx)} ${page}/${totalPages || 1}\n`;

  if (!images.length) {
    text += `\n(${tr("album_images_empty", ctx)})`;
  } else {
    for (const img of images) {
      text += `\n• Image #${img.image_id}`;
    }
  }

  const kb = new InlineKeyboard();
  for (const img of images) {
    kb.text(
      `${tr("group_images", ctx)} ${img.image_id}`,
      `album_img:${albumId}:${img.image_id}`,
    ).row();
    kb.text(
      tr("group_images", ctx),
      `album_remove:${albumId}:${img.image_id}`,
    ).row();
  }

  kb.row()
    .text(tr("albums_pick_1", ctx), `album_add:${albumId}`)
    .text(tr("btn_delete_album", ctx), `album_del:${albumId}`);
  kb.row().text(tr("btn_share_album", ctx), `album_share:${albumId}`);
  if (totalPages > 1) {
    kb.row();
    if (page > 1)
      kb.text(tr("prev_page", ctx), `album_page:${albumId}:${page - 1}`);
    if (page < totalPages)
      kb.text(tr("next_page", ctx), `album_page:${albumId}:${page + 1}`);
  }
  kb.row()
    .text(tr("album_all", ctx), "albums:list")
    .text(tr("btn_menu", ctx), "cmd:main");

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
    await ctx.reply(tr("album_notfoundexp", ctx), {
      reply_markup: new InlineKeyboard().text(tr("btn_menu", ctx), "cmd:main"),
    });
    return;
  }

  const owner = await (
    await import("../../db/queries.js")
  ).getUser(album.user_id);
  const ownerName = owner?.username
    ? `@${owner.username}`
    : owner?.first_name || tr("artist_unknown", ctx);

  const perPage = 5;
  const total = await getAlbumImageCount(album.id);
  const images = await getAlbumImages(album.id, perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  let text = `${tr("btn_share_album", ctx)}\n\n`;
  text += `${album.name}`;
  if (album.description) text += `\n${album.description}`;
  text += `\n${tr("albums_owner", ctx)}: ${ownerName}`;
  text += `\n${total} ${tr("group_images", ctx)} - ${tr("tags_page", ctx)} ${page}/${totalPages || 1}\n`;

  if (!images.length) {
    text += `\n(${tr("album_empty", ctx)})`;
  } else {
    for (const img of images) {
      text += `\n${tr("group_images", ctx)} #${img.image_id}`;
    }
  }

  const kb = new InlineKeyboard();
  for (const img of images) {
    kb.text(
      `${tr("group_images", ctx)} ${img.image_id}`,
      `album_img:${album.id}:${img.image_id}`,
    ).row();
  }
  kb.text(tr("btn_copy_album", ctx), `album_copy:${album.id}`).row();
  if (totalPages > 1) {
    if (page > 1)
      kb.text(
        `${tr("prev_page", ctx)}`,
        `album_sharedpage:${token}:${page - 1}`,
      );
    if (page < totalPages)
      kb.text(
        `${tr("next_page", ctx)}`,
        `album_sharedpage:${token}:${page + 1}`,
      );
  }
  kb.row()
    .text(tr("btn_my_albums", ctx), "albums:list")
    .text(tr("btn_menu", ctx), "cmd:main");

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
