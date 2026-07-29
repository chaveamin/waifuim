import { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { tr } from "../../i18n/index.js";
import { logger } from "../../utils/logger.js";
import { getUser } from "../../db/queries.js";
import animePicsData from "./animePicsData.json";

const data = animePicsData as Record<string, string[]>;
const normalPics: string[] = data.normal;
const uncensoredPics: string[] = data.uncensored;

logger.info(
  `Anime shots data loaded: ${normalPics.length} normal, ${uncensoredPics.length} uncensored`,
);

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function showAnimeShotsMenu(ctx: Context) {
  const kb = new InlineKeyboard()
    .text(tr("animeshots_normal", ctx), "anime_shots:normal")
    .text(tr("animeshots_uncensored", ctx), "anime_shots:uncensored")
    .row()
    .text(tr("btn_back_to_menu", ctx), "cmd:main");

  const text = tr("animeshots_choose", ctx);
  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup: kb })
      .catch(() => ctx.reply(text, { reply_markup: kb }));
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

export async function showAnimeShotsType(
  ctx: Context,
  type: "normal" | "uncensored",
) {
  const label =
    type === "normal"
      ? tr("animeshots_normal", ctx)
      : tr("animeshots_uncensored", ctx);
  const kb = new InlineKeyboard()
    .text(tr("btn_random", ctx), `anime_shots_random:${type}`)
    .row()
    .text(tr("btn_send_group", ctx), `anime_shots_group:${type}`)
    .row()
    .text(tr("btn_back", ctx), "anime_shots:back")
    .text(tr("btn_menu", ctx), "cmd:main");

  const text = `${label}\n\n${tr("animeshots_choose", ctx)}`;
  await ctx
    .editMessageText(text, { reply_markup: kb })
    .catch(() => ctx.reply(text, { reply_markup: kb }));
}

async function handleAnimeShotsRandom(
  ctx: Context,
  type: "normal" | "uncensored",
) {
  const pics = type === "normal" ? normalPics : uncensoredPics;

  if (!pics.length) {
    await ctx.reply(tr("animeshots_notfound", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  const url = pics[Math.floor(Math.random() * pics.length)];
  await ctx.replyWithChatAction("upload_photo");
  await ctx.replyWithPhoto(url).catch(async () => {
    await ctx.replyWithDocument(url).catch(() => {
      ctx.reply("Failed to send image.", {
        reply_markup: new InlineKeyboard().text(
          tr("btn_back_to_menu", ctx),
          "cmd:main",
        ),
      });
    });
  });
}

async function handleAnimeShotsGroup(
  ctx: Context,
  type: "normal" | "uncensored",
) {
  const pics = type === "normal" ? normalPics : uncensoredPics;

  if (!pics.length) {
    await ctx.reply(tr("animeshots_notfound", ctx), {
      reply_markup: new InlineKeyboard().text(
        tr("btn_back_to_menu", ctx),
        "cmd:main",
      ),
    });
    return;
  }

  const userId = ctx.from?.id;
  const user = userId ? await getUser(userId) : undefined;
  const count = user?.image_count ?? 5;

  await ctx.replyWithChatAction("upload_photo");
  const group = getRandomItems(pics, count);
  const media = group.map((url) => ({
    type: "photo" as const,
    media: url,
  }));

  try {
    await ctx.replyWithMediaGroup(media);
  } catch {
    for (let i = 0; i < media.length; i += 10) {
      const batch = media.slice(i, i + 10);
      await ctx.replyWithMediaGroup(batch).catch(() => {});
    }
  }
}

export async function handleAnimeShotsCallback(ctx: Context, data: string) {
  if (data === "anime_shots:menu") {
    await showAnimeShotsMenu(ctx);
    return true;
  }
  if (data === "anime_shots:back") {
    await showAnimeShotsMenu(ctx);
    return true;
  }
  const typeMatch = data.match(/^anime_shots:(normal|uncensored)$/);
  if (typeMatch) {
    await showAnimeShotsType(ctx, typeMatch[1] as "normal" | "uncensored");
    return true;
  }
  const randomMatch = data.match(/^anime_shots_random:(normal|uncensored)$/);
  if (randomMatch) {
    await handleAnimeShotsRandom(
      ctx,
      randomMatch[1] as "normal" | "uncensored",
    );
    return true;
  }
  const groupMatch = data.match(/^anime_shots_group:(normal|uncensored)$/);
  if (groupMatch) {
    await handleAnimeShotsGroup(ctx, groupMatch[1] as "normal" | "uncensored");
    return true;
  }
  return false;
}
