import { Bot } from "grammy";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export const bot = new Bot(config.botToken);

bot.catch((err) => {
  logger.error("Bot error:", err);
});
