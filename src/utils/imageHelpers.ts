import { InlineKeyboard } from "grammy";
import type { WaifuImage } from "../api/types.js";
import type { ImageSearchParams } from "../api/types.js";
import type { DbUser } from "../db/queries.js";
import { formatBytes } from "./formatters.js";
import { tr } from "../i18n/index.js";

export function buildImageCaption(image: WaifuImage, ctx?: any): string {
  const artists = image.artists.map((a) => a.name).join(", ") || "Unknown";
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
    `🖼️ ${tFn("image_id")}: ${image.id}\n` +
    `🎨 ${tFn("image_artist")}: ${artists}\n` +
    `🏷️ ${tFn("image_tags")}: ${tags}\n` +
    `📁 ${tFn("image_size")}: ${formatBytes(image.byteSize)}\n` +
    `${image.width}x${image.height}` +
    (image.isAnimated ? ` (${tFn("image_animated")})` : "") +
    `\n❤️ ${tFn("image_favorites")}: ${image.favorites}`;
  if (image.source) {
    caption += `\n🔗 ${tFn("image_source")}: [${tr("image_source", ctx)}](${image.source})`;
  }
  return caption;
}

export function buildImageKb(
  imageId: number,
  isFavorited: boolean,
  artistId?: number,
  artistName?: string,
): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(
      isFavorited ? "💔 Unfavorite" : "❤️ Favorite",
      `fav_toggle:${imageId}`,
    )
    .text("📚 Albums", `pick_album:${imageId}`)
    .row();
  if (artistId) {
    kb.text(
      `🎨 Another from ${truncate(artistName ?? "Artist", 15)}`,
      `artist_random:${artistId}`,
    );
  }
  kb.text("🎲 Random", "cmd:random")
    .text("🔍 Search", "cmd:search")
    .row()
    .text("🏠 Menu", "cmd:main");
  return kb;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function buildMiniImageKb(
  imageId: number,
  isFavorited: boolean,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(
      isFavorited ? "💔 Unfavorite" : "❤️ Favorite",
      `fav_toggle:${imageId}`,
    )
    .text("📚 Albums", `pick_album:${imageId}`)
    .row()
    .text("🏠 Menu", "cmd:main");
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
