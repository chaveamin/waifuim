import { Context, NextFunction } from "grammy";
import { upsertUser, getUser, isUserBanned, updateActivity, logCommand } from "../../db/queries.js";
import { setLangCache } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";

export async function authMiddleware(ctx: Context, next: NextFunction) {
  const user = ctx.from;
  if (!user) return;

  await upsertUser(user.id, user.username ?? null, user.first_name ?? null, user.last_name ?? null);
  await updateActivity(user.id);

  const dbUser = await getUser(user.id);
  if (dbUser?.language) setLangCache(user.id, dbUser.language as "en" | "fa");

  if (await isUserBanned(user.id)) {
    await ctx.reply("You are banned from using this bot.");
    return;
  }

  if (ctx.message?.text?.startsWith("/")) {
    const cmd = ctx.message.text.split(" ")[0].split("@")[0];
    await logCommand(user.id, cmd);
  }

  await next();
}
