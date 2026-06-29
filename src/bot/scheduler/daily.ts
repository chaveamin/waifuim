import { Bot, Context } from "grammy";
import { searchImages } from "../../api/waifu.js";
import { getDailySubscribers, markDailySent } from "../../db/queries.js";
import {
  buildImageCaption,
  buildSearchParams,
} from "../../utils/imageHelpers.js";
import { logger } from "../../utils/logger.js";
import { tr } from "../../i18n/index.js";

export function startDailyScheduler(bot: Bot, ctx: Context) {
  setInterval(async () => {
    try {
      await sendDailyImages(bot);
    } catch (err) {
      logger.error("Daily scheduler error:", err);
    }
  }, 60_000);

  logger.info(tr("daily_check", ctx));
}

async function sendDailyImages(bot: Bot, ctx: Context) {
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

      const dailyOptions = {
        caption: `${tr("daily_img", ctx)}\n\n${caption}`,
        parse_mode: "Markdown" as const,
      };

      if (user.send_mode === "document") {
        await bot.api.sendDocument(user.telegram_id, image.url, dailyOptions);
      } else {
        await bot.api.sendPhoto(user.telegram_id, image.url, dailyOptions);
      }

      await markDailySent(user.telegram_id);
      logger.info(`Daily image sent to ${user.telegram_id}`);
    } catch (err) {
      logger.error(`Failed to send daily image to ${user.telegram_id}:`, err);
    }
  }
}
