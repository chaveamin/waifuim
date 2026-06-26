import { Bot } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getDailySubscribers, markDailySent } from "../../db/queries.js";
import { buildImageCaption, buildSearchParams } from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";

export function startDailyScheduler(bot: Bot) {
  setInterval(async () => {
    try {
      await sendDailyImages(bot);
    } catch (err) {
      logger.error("Daily scheduler error:", err);
    }
  }, 60_000);

  logger.info("Daily image scheduler started (checks every 60s)");
}

async function sendDailyImages(bot: Bot) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  const subscribers = await getDailySubscribers();

  for (const user of subscribers) {
    if (user.last_daily_sent?.startsWith(todayStr)) continue;
    if (user.daily_hour !== currentHour) continue;

    if (Math.abs(currentMinute - (user.daily_minute ?? 0)) > 1) continue;

    try {
      const params = buildSearchParams(user, { PageSize: 1 });
      const result = await searchImages(params);

      if (!result.items.length) continue;

      const image = result.items[0];
      const caption = buildImageCaption(image);

      await bot.api.sendPhoto(user.telegram_id, image.url, {
        caption: `🌅 Good Morning! Here's your daily waifu.\n\n${caption}`,
        parse_mode: "Markdown",
      });

      await markDailySent(user.telegram_id);
      logger.info(`Daily image sent to ${user.telegram_id}`);
    } catch (err) {
      logger.error(`Failed to send daily image to ${user.telegram_id}:`, err);
    }
  }
}
