import { Context, NextFunction } from "grammy";
import { isUserAdmin } from "../../db/queries.js";

export async function adminMiddleware(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;
  if (!userId || !isUserAdmin(userId)) {
    await ctx.reply("Admin access required.");
    return;
  }
  await next();
}
