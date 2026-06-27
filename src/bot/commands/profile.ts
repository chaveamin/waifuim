import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  getUser,
  getFavoriteCount,
  getUserCommandCount,
} from "../../db/queries.js";
import { tr } from "../../i18n/index.js";

export function registerProfile(bot: any) {
  bot.command("profile", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await showProfile(ctx, userId);
  });
}

async function showProfile(ctx: Context, telegramId: number) {
  const user = await getUser(telegramId);
  if (!user) {
    await ctx.reply("User not found.", {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  const favCount = await getFavoriteCount(telegramId);
  const cmdCount = await getUserCommandCount(telegramId);
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

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
