import { bot } from "./bot/bot.js";
import { Context } from "grammy";
import { authMiddleware } from "./bot/middleware/auth.js";
import { registerStart } from "./bot/commands/start.js";
import { registerHelp } from "./bot/commands/help.js";
import { registerRandom } from "./bot/commands/random.js";
import { registerSearch } from "./bot/commands/search.js";
import { registerTags } from "./bot/commands/tags.js";
import { registerArtists } from "./bot/commands/artists.js";
import { registerImage } from "./bot/commands/image.js";
import { registerStats } from "./bot/commands/stats.js";
import { registerSettings } from "./bot/commands/settings.js";
import { registerFavorites } from "./bot/commands/favorites.js";
import { registerProfile } from "./bot/commands/profile.js";
import { registerGroup } from "./bot/commands/group.js";
import { registerDaily } from "./bot/commands/daily.js";
import { registerAlbums } from "./bot/commands/albums.js";
import { registerLeaderboard } from "./bot/commands/leaderboard.js";
import { startDailyScheduler } from "./bot/scheduler/daily.js";
import { registerAdminPanel } from "./bot/admin/panel.js";
import { registerAdminUsers } from "./bot/admin/users.js";
import { registerAdminBroadcast } from "./bot/admin/broadcast.js";
import { registerAdminStats } from "./bot/admin/statistics.js";
import { registerCallbackHandlers } from "./bot/handlers/callback.js";
import { registerInlineMode } from "./bot/handlers/inline.js";
import { registerCancelHandler } from "./bot/handlers/cancel.js";
import { initDb } from "./db/database.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.info("Initializing database...");
  await initDb();

  logger.info("Registering middleware...");
  bot.use(authMiddleware);

  logger.info("Registering commands...");
  registerStart(bot);
  registerHelp(bot);
  registerRandom(bot);
  registerSearch(bot);
  registerTags(bot);
  registerArtists(bot);
  registerImage(bot);
  registerStats(bot);
  registerSettings(bot);
  registerFavorites(bot);
  registerProfile(bot);
  registerGroup(bot);
  registerDaily(bot);
  registerAlbums(bot);
  registerLeaderboard(bot);

  logger.info("Registering admin panel...");
  registerAdminPanel(bot);
  registerAdminUsers(bot);
  registerAdminBroadcast(bot);
  registerAdminStats(bot);

  logger.info("Registering handlers...");
  registerCallbackHandlers(bot);
  registerInlineMode(bot);
  registerCancelHandler(bot);

  logger.info("Starting bot...");
  startDailyScheduler(bot);
  bot.start({
    onStart: (botInfo) => {
      logger.info(`Bot started: @${botInfo.username} (${botInfo.id})`);
    },
  });
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
