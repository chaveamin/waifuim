import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { config } from "../../config.js";
import { tr, t, getLang, setLangCache } from "../../i18n/index.js";
import { setLanguage } from "../../db/queries.js";

export function registerStart(bot: any) {
  bot.command("start", async (ctx: Context) => {
    const payload = ctx.message?.text?.split(" ").slice(1).join(" ");
    const lang = getLang(ctx);

    if (payload?.startsWith("album_")) {
      const token = payload.replace("album_", "");
      const { getAlbumByShareToken } = await import("../../db/queries.js");
      const album = await getAlbumByShareToken(token);

      if (!album) {
        await ctx.reply(t("image_not_found", lang), {
          reply_markup: new InlineKeyboard().text(
            tr("btn_menu", ctx),
            "cmd:main",
          ),
        });
        return;
      }

      const { getUser } = await import("../../db/queries.js");
      const owner = await getUser(album.user_id);
      const ownerName = owner?.username
        ? `@${owner.username}`
        : owner?.first_name || "Unknown";

      let text = `${tr("albums_shared_view", ctx)}\n\n📁 ${album.name}`;
      if (album.description) text += `\n📝 ${album.description}`;
      text += `\n👤 ${tr("albums_owner", ctx)}: ${ownerName}`;

      const kb = new InlineKeyboard()
        .text(tr("btn_view_album", ctx), `album_viewshared:${token}`)
        .text(tr("btn_copy_album", ctx), `album_copy:${album.id}`)
        .row()
        .text(tr("btn_my_albums", ctx), "albums:list")
        .text(tr("btn_menu", ctx), "cmd:main");

      await ctx.reply(text, { reply_markup: kb });
      return;
    }

    if (!payload || payload === "lang") {
      const { getUser } = await import("../../db/queries.js");
      const existingUser = await getUser(ctx.from?.id!);
      if (existingUser?.language) {
        await showMainMenu(ctx);
        return;
      }
      const kb = new InlineKeyboard()
        .text("🇺🇸 English", "set_lang:en")
        .text("🇮🇷 فارسی", "set_lang:fa");
      await ctx.reply(tr("choose_lang", ctx), { reply_markup: kb });
      return;
    }

    await showMainMenu(ctx);
  });

  bot.callbackQuery(/^set_lang:(en|fa)$/, async (ctx: Context) => {
    const lang = ctx.match![1] as "en" | "fa";
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    await setLanguage(userId, lang);
    setLangCache(userId, lang);
    await ctx.answerCallbackQuery({ text: t("lang_set", lang) });
    await showMainMenu(ctx);
  });
}

export async function showMainMenu(ctx: Context) {
  const lang = getLang(ctx);
  const isAdmin = !!(
    config.adminTelegramId && ctx.from?.id === config.adminTelegramId
  );

  const kb = new InlineKeyboard()
    .text(t("btn_random", lang), "cmd:random")
    .text(t("btn_send_group", lang), "cmd:group")
    .row()
    .text(t("btn_search", lang), "cmd:search")
    .text(t("btn_tags", lang), "cmd:tags")
    .row()
    .text(t("btn_artists", lang), "cmd:artists")
    .text(t("btn_favorites", lang), "cmd:favorites")
    .row()
    .text(t("btn_albums", lang), "cmd:albums")
    .text(t("btn_daily", lang), "cmd:daily")
    .row()
    .text(t("btn_profile", lang), "cmd:profile")
    .text(t("btn_settings", lang), "cmd:settings")
    .row()
    .text(t("btn_leaderboard", lang), "cmd:leaderboard")
    .text(t("btn_help", lang), "cmd:help");

  if (isAdmin) kb.row().text(t("btn_admin_panel", lang), "cmd:admin");

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(t("welcome", lang), { reply_markup: kb })
      .catch(() => ctx.reply(t("welcome", lang), { reply_markup: kb }));
  } else {
    await ctx.reply(t("welcome", lang), { reply_markup: kb });
  }
}
