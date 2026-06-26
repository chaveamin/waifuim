import { Context } from "grammy";

export function registerCancelHandler(bot: any) {
  bot.command("cancel", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { getBroadcastState } = await import("../admin/broadcast.js");
    const state = getBroadcastState();
    if (state.has(userId)) {
      state.delete(userId);
      await ctx.reply("Operation cancelled.");
      return;
    }

    await ctx.reply("Nothing to cancel.");
  });
}
