import { InlineKeyboard, Context } from "grammy";
import type { WaifuImage } from "../api/types.js";
import type { ImageSearchParams } from "../api/types.js";
import type { DbUser } from "../db/queries.js";
import { formatBytes } from "./formatters.js";
import { tr } from "../i18n/index.js";

export function buildImageCaption(image: WaifuImage, ctx?: any): string {
  const artists =
    image.artists.map((a) => a.name).join(", ") || tr("artist_unknown", ctx);
  const tags = image.tags.map((t) => t.name).join(", ");
  const tFn = (key: string) =>
    ctx
      ? tr(key, ctx)
      : key === "image_id"
        ? "ID"
        : key === "image_artist"
          ? "Artist"
          : key === "image_tags"
            ? "Tags"
            : key === "image_size"
              ? "Size"
              : key === "image_favorites"
                ? "Favorites"
                : key === "image_source"
                  ? "Source"
                  : key === "image_animated"
                    ? "GIF"
                    : key;
  let caption =
    `${tFn("image_id")}: ${image.id}\n` +
    `${tFn("image_artist")}: ${artists}\n` +
    `${tFn("image_tags")}: ${tags}\n` +
    `${tFn("image_size")}: ${formatBytes(image.byteSize)}\n` +
    (image.isAnimated ? ` (${tFn("image_animated")})` : "") +
    `\n${tFn("image_favorites")}: ${image.favorites}`;
  if (image.source) {
    caption += `\n[${tr("image_source", ctx)}](${image.source})`;
  }
  return caption;
}

export function buildImageKb(
  imageId: number,
  isFavorited: boolean,
  ctx: Context,
  artistId?: number,
  artistName?: string,
): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(
      isFavorited ? tr("btn_unfav", ctx) : tr("btn_fav", ctx),
      `fav_toggle:${imageId}`,
    )
    .text(tr("btn_albums_pick", ctx), `pick_album:${imageId}`)
    .row();
  if (artistId) {
    kb.text(
      `${tr("artist_another", ctx)} ${truncate(artistName ?? "Artist", 15)}`,
      `artist_random:${artistId}`,
    );
  }
  kb.text(tr("btn_randommore", ctx), "cmd:random")
    .text(tr("btn_search", ctx), "cmd:search")
    .row()
    .text(tr("btn_menu", ctx), "cmd:main");
  return kb;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function buildMiniImageKb(
  imageId: number,
  isFavorited: boolean,
  ctx: Context,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(
      isFavorited ? "💔 Unfavorite" : "❤️ Favorite",
      `fav_toggle:${imageId}`,
    )
    .text(tr("btn_albums_pick", ctx), `pick_album:${imageId}`)
    .row()
    .text(tr("btn_menu", ctx), "cmd:main");
}

export function buildSearchParams(
  user: DbUser | undefined,
  overrides: Partial<ImageSearchParams> = {},
): ImageSearchParams {
  const params: ImageSearchParams = {
    PageSize: overrides.PageSize ?? user?.image_count ?? 1,
    IsNsfw:
      overrides.IsNsfw ??
      (user?.nsfw_mode === "nsfw"
        ? "True"
        : user?.nsfw_mode === "any"
          ? "All"
          : "False"),
  };

  if (overrides.IncludedTags) params.IncludedTags = overrides.IncludedTags;
  if (overrides.IncludedArtists)
    params.IncludedArtists = overrides.IncludedArtists;
  if (overrides.Page) params.Page = overrides.Page;
  if (overrides.OrderBy) params.OrderBy = overrides.OrderBy;

  const orientation = user?.orientation ?? "any";
  if (orientation === "landscape" || orientation === "portrait") {
    params.Orientation = orientation as "Landscape" | "Portrait";
  }

  const animation = user?.animation_mode ?? "any";
  if (animation === "animated") {
    params.IsAnimated = true;
  } else if (animation === "static") {
    params.IsAnimated = false;
  }

  return params;
}

export async function replyWithMediaUniversal(
  ctx: Context,
  user: DbUser | undefined,
  url: string,
  options: any,
) {
  const isDocument = user?.send_mode === "document";
  if (isDocument) {
    return await ctx.replyWithDocument(url, options);
  } else {
    return await ctx.replyWithPhoto(url, options);
  }
}
