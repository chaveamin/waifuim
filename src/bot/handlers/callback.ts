import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getRandomImage,
  searchImages,
  getTags,
  getArtists,
  getPublicStats,
} from "../../api/waifu.js";
import { getUser, isFavorited } from "../../db/queries.js";
import { config } from "../../config.js";
import { paginateArray } from "../../utils/formatters.js";
import {
  buildImageCaption,
  buildImageKb,
  buildSearchParams,
} from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";
import { tr, t, getLang } from "../../i18n/index.js";
import { showMainMenu } from "../commands/start.js";
import { replyWithMediaUniversal } from "../../utils/imageHelpers.js";

export function registerCallbackHandlers(bot: any) {
  bot.callbackQuery(/^cmd:(.+)$/, async (ctx: Context) => {
    const cmd = ctx.match![1];
    try {
      await ctx.answerCallbackQuery();
      switch (cmd) {
        case "random":
          await handleRandom(ctx);
          break;
        case "search":
          await handleSearch(ctx);
          break;
        case "tags":
          await handleTags(ctx);
          break;
        case "artists":
          await handleArtists(ctx);
          break;
        case "stats":
          await handleStats(ctx);
          break;
        case "settings":
          await handleSettings(ctx);
          break;
        case "help":
          await handleHelp(ctx);
          break;
        case "main":
          await showMainMenu(ctx);
          break;
        case "favorites":
          await handleFavorites(ctx);
          break;
        case "profile":
          await handleProfile(ctx);
          break;
        case "group":
          await handleGroup(ctx);
          break;
        case "daily":
          await handleDaily(ctx);
          break;
        case "albums":
          await handleAlbums(ctx);
          break;
        case "leaderboard":
          await handleLeaderboard(ctx);
          break;
      }
    } catch (err: any) {
      logger.error(`cmd:${cmd} handler error:`, err);
      await ctx
        .reply(`Error in ${cmd}: ${err?.message || err}`)
        .catch(() => {});
    }
  });
}

async function editOrSend(ctx: Context, text: string, options?: any) {
  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, options)
      .catch(() => ctx.reply(text, options));
  } else {
    await ctx.reply(text, options);
  }
}

async function handleRandom(ctx: Context) {
  await ctx.replyWithChatAction("upload_photo");
  try {
    const userId = ctx.from?.id!;
    const user = await getUser(userId);
    const params = buildSearchParams(user, { PageSize: 1 });
    const result = await searchImages(params);

    if (!result.items.length) {
      await editOrSend(ctx, tr("no_images", ctx), {
        reply_markup: new InlineKeyboard().text(
          tr("btn_settings", ctx),
          "cmd:settings",
        ),
      });
      return;
    }

    const image = result.items[0];
    const fav = await isFavorited(userId, image.id);
    const caption = buildImageCaption(image, ctx);
    const kb = buildImageKb(image.id, fav, ctx);
    await replyWithMediaUniversal(ctx, user, image.url, {
      caption,
      reply_markup: kb,
      parse_mode: "Markdown",
    });
  } catch (err) {
    logger.error("Random image error:", err);
    await editOrSend(ctx, tr("random_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

async function handleSearch(ctx: Context) {
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
    .text(tr("btn_random", ctx), "search_random:sfw")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, tr("search_tags_title", ctx), { reply_markup: kb });
}

async function handleTags(ctx: Context) {
  try {
    const tags = await getTags();
    const { items, totalPages } = paginateArray(tags, 1, 20);
    let text = `${tr("tags_title", ctx)} (Page 1/${totalPages}, ${tags.length} ${tr("tags_total", ctx)}):\n\n`;
    for (const tag of items) text += `• ${tag.name}\n`;

    const kb = new InlineKeyboard();
    for (const tag of items)
      kb.text(`🏷️ ${tag.name}`, `search_tag:${tag.slug}`).row();
    kb.row().text(tr("btn_back_to_menu", ctx), "cmd:main");
    if (totalPages > 1) kb.text(`▶️ ${tr("next_page", ctx)}`, "tags_page:2");

    await editOrSend(ctx, text, { reply_markup: kb });
  } catch (err) {
    logger.error("Tags error:", err);
    await editOrSend(ctx, tr("tags_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

async function handleArtists(ctx: Context) {
  try {
    const artists = await getArtists();
    const { items, totalPages } = paginateArray(artists, 1, 15);
    let text = `${tr("artists_title", ctx)} (Page 1/${totalPages}, ${artists.length}):\n\n`;
    for (const a of items) text += `• ${a.name} (ID: ${a.id})\n`;

    const kb = new InlineKeyboard();
    for (const a of items)
      kb.text(`🎨 ${a.name}`, `artist_images:${a.id}`).row();
    kb.row().text(tr("btn_back_to_menu", ctx), "cmd:main");
    if (totalPages > 1) kb.text("▶️ Next", "artists_page:2");

    await editOrSend(ctx, text, { reply_markup: kb });
  } catch (err) {
    logger.error("Artists error:", err);
    await editOrSend(ctx, tr("artists_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

async function handleStats(ctx: Context) {
  try {
    const stats = await getPublicStats();
    const kb = new InlineKeyboard().text(
      tr("btn_back_to_menu", ctx),
      "cmd:main",
    );
    const lang = getLang(ctx);
    await editOrSend(
      ctx,
      `${tr("stats_title", ctx)}\n\n` +
        `📈 ${tr("stats_requests", ctx)}: ${stats.totalRequests.toLocaleString()}\n` +
        `🖼️ ${tr("stats_images", ctx)}: ${stats.totalImages.toLocaleString()}\n` +
        `🏷️ ${tr("stats_tags", ctx)}: ${stats.totalTags.toLocaleString()}\n` +
        `🎨 ${tr("stats_artists", ctx)}: ${stats.totalArtists.toLocaleString()}`,
      { reply_markup: kb },
    );
  } catch (err) {
    logger.error("Stats error:", err);
    await editOrSend(ctx, tr("stats_failed", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
  }
}

async function handleSettings(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await getUser(userId);
  const nsfwMode = user?.nsfw_mode ?? "sfw";
  const count = user?.image_count ?? 1;
  const orientation = user?.orientation ?? "any";
  const animation = user?.animation_mode ?? "any";
  const sendMode = user?.send_mode ?? "photo";
  const lang = getLang(ctx);

  const nsfwLabel = config.nsfwAllowed
    ? nsfwMode === "nsfw"
      ? `✅ ${tr("settings_nsfw_only", ctx)}`
      : nsfwMode === "any"
        ? `✅ ${tr("settings_sfw_nsfw", ctx)}`
        : `✅ ${tr("settings_sfw_only", ctx)}`
    : `${tr("settings_sfw_only", ctx)} ${tr("settings_admin_locked", ctx)}`;

  const text =
    `${tr("settings_title", ctx)}\n\n` +
    `${tr("settings_content", ctx)}: ${nsfwLabel}\n` +
    `${tr("settings_images_per", ctx)}: ${count}\n` +
    `${tr("settings_orientation", ctx)}: ${orientation === "landscape" ? tr("settings_landscape", ctx) : orientation === "portrait" ? tr("settings_portrait", ctx) : tr("settings_any", ctx)}\n` +
    `${tr("settings_animation", ctx)}: ${animation === "animated" ? tr("settings_animated", ctx) : animation === "static" ? tr("settings_static", ctx) : tr("settings_any", ctx)}\n\n` +
    `${tr("settings_send_mode", ctx)}: ${sendMode === "document" ? tr("settings_document", ctx) : tr("settings_photo", ctx)}\n\n` +
    `${tr("settings_tap_change", ctx)}`;

  const kb = new InlineKeyboard();
  if (config.nsfwAllowed) {
    kb.text(
      nsfwMode === "sfw"
        ? `✅ ${tr("settings_sfw_only", ctx)}`
        : `${tr("settings_sfw_only", ctx)}`,
      "set_nsfw:sfw",
    );
    kb.text(
      nsfwMode === "nsfw"
        ? `✅ ${tr("settings_nsfw_only", ctx)}`
        : `${tr("settings_nsfw_only", ctx)}`,
      "set_nsfw:nsfw",
    ).row();
    kb.text(
      nsfwMode === "any"
        ? `✅ ${tr("settings_sfw_nsfw", ctx)}`
        : `${tr("settings_sfw_nsfw", ctx)}`,
      "set_nsfw:any",
    ).row();
  }

  kb.text(count === 1 ? `✅ 1` : "1", "set_count:1")
    .text(count === 3 ? `✅ 3` : "3", "set_count:3")
    .row()
    .text(count === 5 ? `✅ 5` : "5", "set_count:5")
    .text(count === 10 ? `✅ 10` : "10", "set_count:10")
    .row();

  kb.text(
    orientation === "landscape"
      ? `✅ ${tr("settings_landscape", ctx)}`
      : `${tr("settings_landscape", ctx)}`,
    "set_orientation:landscape",
  )
    .text(
      orientation === "portrait"
        ? `✅ ${tr("settings_portrait", ctx)}`
        : `${tr("settings_portrait", ctx)}`,
      "set_orientation:portrait",
    )
    .row()

    .text(
      orientation === "any"
        ? `✅ ${tr("settings_any", ctx)}`
        : `${tr("settings_any", ctx)}`,
      "set_orientation:any",
    )
    .row();
  kb.text(
    animation === "animated"
      ? `✅ ${tr("settings_animated", ctx)}`
      : `${tr("settings_animated", ctx)}`,
    "set_animation:animated",
  )
    .text(
      animation === "static"
        ? `✅ ${tr("settings_static", ctx)}`
        : `${tr("settings_static", ctx)}`,
      "set_animation:static",
    )
    .row()
    .text(
      animation === "any"
        ? `✅ ${tr("settings_any", ctx)}`
        : `${tr("settings_any", ctx)}`,
      "set_animation:any",
    )
    .row();

  kb.text(sendMode === "photo" ? "✅ Photo" : "Photo", "set_send_mode:photo")
    .text(
      sendMode === "document" ? "✅ File" : "File",
      "set_send_mode:document",
    )
    .row();

  kb.text(lang === "fa" ? "🇮🇷" : "🇺🇸 English", "set_lang:pick").row();

  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}

async function handleHelp(ctx: Context) {
  const lang = getLang(ctx);
  const text =
    `${tr("help_title", ctx)}\n\n` +
    `${tr("cmd_random", ctx)}\n` +
    `${tr("cmd_group", ctx)}\n` +
    `${tr("cmd_daily", ctx)}\n` +
    `${tr("cmd_albums", ctx)}\n` +
    `${tr("cmd_leaderboard", ctx)}\n` +
    `${tr("cmd_search", ctx)}\n` +
    `${tr("cmd_tags", ctx)}\n` +
    `${tr("cmd_artists", ctx)}\n` +
    `${tr("cmd_image", ctx)}\n` +
    `${tr("cmd_favorites", ctx)}\n` +
    `${tr("cmd_profile", ctx)}\n` +
    `${tr("cmd_settings", ctx)}\n` +
    `${tr("cmd_stats", ctx)}\n\n` +
    `${tr("inline_mode", ctx)}\n` +
    `${tr("inline_tip", ctx)}\n\n`;

  const isAdmin = !!(
    config.adminTelegramId && ctx.from?.id === config.adminTelegramId
  );
  const adminText = isAdmin;

  const kb = new InlineKeyboard()
    .text(tr("btn_random", ctx), "cmd:random")
    .text(tr("btn_send_group", ctx), "cmd:group")
    .row()
    .text(tr("btn_search", ctx), "cmd:search")
    .text(tr("btn_tags", ctx), "cmd:tags")
    .row()
    .text(tr("btn_artists", ctx), "cmd:artists")
    .text(tr("btn_favorites", ctx), "cmd:favorites")
    .row()
    .text(tr("btn_albums", ctx), "cmd:albums")
    .text(tr("btn_daily", ctx), "cmd:daily")
    .row()
    .text(tr("btn_profile", ctx), "cmd:profile")
    .text(tr("btn_settings", ctx), "cmd:settings")
    .row()
    .text(tr("btn_leaderboard", ctx), "cmd:leaderboard");

  if (isAdmin) kb.row().text(tr("btn_admin_panel", ctx), "cmd:admin");

  await editOrSend(ctx, text + adminText, { reply_markup: kb });
}

async function handleFavorites(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const { getUserFavorites, getFavoriteCount } =
    await import("../../db/queries.js");
  const favs = await getUserFavorites(userId, 5, 0);
  const total = await getFavoriteCount(userId);

  if (!favs.length) {
    await editOrSend(ctx, tr("fav_empty", ctx), {
      reply_markup: new InlineKeyboard()
        .text(tr("btn_random", ctx), "cmd:random")
        .text(tr("btn_search", ctx), "cmd:search")
        .row()
        .text(tr("btn_back_to_menu", ctx), "cmd:main"),
    });
    return;
  }

  let text = `${tr("fav_title", ctx)} (${total})\n\n`;
  for (const f of favs) text += `• 🖼️ #${f.image_id}\n`;

  const kb = new InlineKeyboard();
  for (const f of favs)
    kb.text(`🖼️ ${f.image_id}`, `fav_view:${f.image_id}`).row();
  kb.row().text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}

async function handleProfile(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const {
    getUser: getDbUser,
    getFavoriteCount,
    getUserCommandCount,
  } = await import("../../db/queries.js");
  const user = await getDbUser(userId);
  if (!user) {
    await editOrSend(ctx, "User not found.");
    return;
  }
  const favCount = await getFavoriteCount(userId);
  const cmdCount = await getUserCommandCount(userId);
  const displayName = user.username
    ? `@${user.username}`
    : `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Unknown";
  const statusEmoji = user.is_banned ? "🚫" : user.is_admin ? "" : "✅";
  const statusText = user.is_banned
    ? tr("profile_banned", ctx)
    : user.is_admin
      ? tr("profile_admin", ctx)
      : tr("profile_active", ctx);
  const count = user.image_count ?? 1;
  const orientation = user.orientation ?? "any";
  const animation = user.animation_mode ?? "any";
  const nsfwMode = user.nsfw_mode ?? "sfw";

  const text =
    `${tr("profile_title", ctx)}\n\n` +
    `${tr("profile_name", ctx)}: ${displayName}\n` +
    `${tr("profile_id", ctx)}: ${user.telegram_id}\n` +
    `${tr("profile_status", ctx)}: ${statusEmoji} ${statusText}\n` +
    `${tr("profile_commands", ctx)}: ${cmdCount}\n` +
    `${tr("profile_favorites", ctx)}: ${favCount}\n\n` +
    `${tr("profile_preferences", ctx)}\n` +
    `  ${tr("profile_content", ctx)}: ${nsfwMode === "nsfw" ? tr("settings_nsfw_only", ctx) : nsfwMode === "any" ? tr("settings_sfw_nsfw", ctx) : tr("settings_sfw_only", ctx)}\n` +
    `  ${tr("settings_images_per", ctx)}: ${count}\n` +
    `  ${tr("settings_orientation", ctx)}: ${orientation === "any" ? tr("settings_any", ctx) : orientation}\n` +
    `  ${tr("settings_animation", ctx)}: ${animation === "any" ? tr("settings_any", ctx) : animation}\n\n` +
    `${tr("profile_joined", ctx)}: ${user.created_at}\n` +
    `${tr("profile_last_active", ctx)}: ${user.last_active}`;

  const kb = new InlineKeyboard()
    .text(tr("btn_favorites", ctx), "cmd:favorites")
    .text(tr("btn_settings", ctx), "cmd:settings")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}

async function handleGroup(ctx: Context) {
  const { sendGroup } = await import("../commands/group.js");
  await sendGroup(ctx);
}

async function handleDaily(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const user = await getUser(userId);
  const subscribed = user?.daily_subscribed === 1;
  const hour = user?.daily_hour ?? 9;
  const minute = user?.daily_minute ?? 0;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const text =
    `${tr("daily_title", ctx)}\n\n` +
    `${tr("daily_not_subscribed", ctx) === "Not subscribed" ? tr("daily_not_subscribed", ctx) : tr("daily_subscribed", ctx)}: ${subscribed ? "✅" : "❌"}\n` +
    `🕐 ${tr("daily_send_time", ctx)}: ${timeStr}\n\n` +
    `${subscribed ? tr("daily_desc", ctx) : tr("daily_not_desc", ctx)}`;

  const kb = new InlineKeyboard();
  kb.text(
    subscribed ? tr("btn_unsubscribe", ctx) : tr("btn_subscribe", ctx),
    "daily:toggle",
  ).row();
  if (!subscribed) {
    kb.text("🕐 08:00", "daily_time:8")
      .text("🕐 09:00", "daily_time:9")
      .text("🕐 10:00", "daily_time:10")
      .row()
      .text("🕐 12:00", "daily_time:12")
      .text("🕐 18:00", "daily_time:18")
      .text("🕐 20:00", "daily_time:20")
      .row();
  }
  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}

async function handleAlbums(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const { getUserAlbums } = await import("../../db/queries.js");
  const albums = await getUserAlbums(userId);

  if (!albums.length) {
    const kb = new InlineKeyboard()
      .text(tr("btn_create_album", ctx), "albums:create")
      .text(tr("btn_back_to_menu", ctx), "cmd:main");
    await editOrSend(ctx, tr("albums_empty", ctx), { reply_markup: kb });
    return;
  }

  let text = `${tr("albums_title", ctx)} (${albums.length})\n\n`;
  for (const a of albums) text += `📁 ${a.name} — ${a.image_count}\n`;

  const kb = new InlineKeyboard();
  for (const a of albums)
    kb.text(`📁 ${a.name} (${a.image_count})`, `album_view:${a.id}`).row();
  kb.text(tr("btn_create_album", ctx), "albums:create").row();
  kb.text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}

async function handleLeaderboard(ctx: Context) {
  const { getUserCount, getAlbumsTotalCount, getDailySubscribersCount } =
    await import("../../db/queries.js");
  const totalUsers = await getUserCount();
  const totalAlbums = await getAlbumsTotalCount();
  const dailyCount = await getDailySubscribersCount();

  const text =
    `${tr("lb_title", ctx)}\n\n` +
    `📊 ${tr("lb_community", ctx)}\n` +
    `  👥 ${tr("lb_users", ctx)}: ${totalUsers}\n` +
    `  📚 ${tr("lb_albums", ctx)}: ${totalAlbums}\n` +
    `  📅 ${tr("lb_daily_sub", ctx)}: ${dailyCount}\n\n` +
    `${tr("lb_choose", ctx)}`;

  const kb = new InlineKeyboard()
    .text(tr("lb_active", ctx), "lb:active")
    .text(tr("lb_most_fav", ctx), "lb:favorites")
    .row()
    .text(tr("lb_most_albums", ctx), "lb:albums")
    .text(tr("lb_my_stats", ctx), "lb:me")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  await editOrSend(ctx, text, { reply_markup: kb });
}
