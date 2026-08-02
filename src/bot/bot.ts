import { Bot } from "grammy";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export const bot = new Bot(config.botToken);

bot.on("channel_post", async (ctx) => {
  const post = ctx.channelPost;
  if (!post) return;

  const chat = ctx.chat;
  const channelName = chat?.title ?? chat?.username ?? "private channel";
  const chatId = chat?.id;
  const messageId = post.message_id;
  const description = post.document?.file_name
    ? `document=${post.document.file_name}`
    : post.text
      ? `text=${post.text.slice(0, 100)}`
      : "channel post";

  logger.info(
    `Channel post received: ${channelName} (${chatId}) message_id=${messageId} ${description}`,
  );
});

bot.catch((err) => {
  logger.error("Bot error:", err);
});
