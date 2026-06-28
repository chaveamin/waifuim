import { config } from "../config.js";
import type {
  WaifuImage,
  WaifuTag,
  WaifuArtist,
  PaginatedResponse,
  ImageSearchParams,
  PublicStats,
} from "./types.js";

const BASE = config.waifuApiBase;

function buildQuery(params: Record<string, unknown>): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value)
        entries.push(`${key}=${encodeURIComponent(String(v))}`);
    } else {
      entries.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  return entries.length ? `?${entries.join("&")}` : "";
}

async function apiGet<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const query = params ? buildQuery(params) : "";
  const url = `${BASE}${path}${query}`;
  const headers: Record<string, string> = {};
  if (config.waifuApiKey) headers["X-Api-Key"] = config.waifuApiKey;
  const res = await fetch(url, { headers });
  if (!res.ok)
    throw new Error(`Waifu API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function searchImages(
  params: ImageSearchParams = {},
): Promise<PaginatedResponse<WaifuImage>> {
  const q: Record<string, unknown> = {};
  if (params.IncludedTags?.length) q.IncludedTags = params.IncludedTags;
  if (params.ExcludedTags?.length) q.ExcludedTags = params.ExcludedTags;
  if (params.IsNsfw) q.IsNsfw = params.IsNsfw;
  if (params.IncludedArtists?.length)
    q.IncludedArtists = params.IncludedArtists;
  if (params.Orientation) q.Orientation = params.Orientation;
  if (params.MinHeight) q.MinHeight = params.MinHeight;
  if (params.MaxHeight) q.MaxHeight = params.MaxHeight;
  if (params.MinWidth) q.MinWidth = params.MinWidth;
  if (params.MaxWidth) q.MaxWidth = params.MaxWidth;
  if (params.MinByteSize) q.MinByteSize = params.MinByteSize;
  if (params.MaxByteSize) q.MaxByteSize = params.MaxByteSize;
  if (params.IsAnimated !== undefined) q.IsAnimated = params.IsAnimated;
  if (params.OrderBy) q.OrderBy = params.OrderBy;
  if (params.Page) q.Page = params.Page;
  if (params.PageSize) q.PageSize = params.PageSize;
  return apiGet<PaginatedResponse<WaifuImage>>("/images", q);
}

export async function getImageById(id: number): Promise<WaifuImage> {
  return apiGet<WaifuImage>(`/images/${id}`);
}

export async function getRandomImage(options?: {
  tags?: string[];
  nsfw?: "True" | "False" | "All";
}): Promise<WaifuImage> {
  const params: ImageSearchParams = {
    PageSize: 1,
    Page: 1,
  };
  if (options?.tags?.length) params.IncludedTags = options.tags;
  if (options?.nsfw) params.IsNsfw = options.nsfw;
  else params.IsNsfw = "False";
  const res = await searchImages(params);
  if (!res.items.length) throw new Error("No images found");
  return res.items[0];
}

export async function getTags(name?: string): Promise<WaifuTag[]> {
  const params: Record<string, unknown> = {};
  if (name) params.Name = name;
  const res = await apiGet<PaginatedResponse<WaifuTag>>("/tags", params);
  return res.items;
}

export async function getArtists(name?: string): Promise<WaifuArtist[]> {
  const all: WaifuArtist[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const params: Record<string, unknown> = { Page: page };
    if (name) params.Name = name;
    const res = await apiGet<PaginatedResponse<WaifuArtist>>(
      "/artists",
      params,
    );
    all.push(...res.items);
    hasNext = res.hasNextPage;
    page++;
  }
  return all;
}

export async function getPublicStats(): Promise<PublicStats> {
  return apiGet<PublicStats>("/stats/public");
}
