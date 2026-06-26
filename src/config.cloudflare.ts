let envCache: Record<string, string> = {};

export function loadConfig() {
  if (Object.keys(envCache).length) return;
  envCache = {
    BOT_TOKEN: (globalThis as any).BOT_TOKEN || "",
    ADMIN_TELEGRAM_ID: (globalThis as any).ADMIN_TELEGRAM_ID || "",
    WAIFU_API_KEY: (globalThis as any).WAIFU_API_KEY || "",
    NSFW_ALLOWED: (globalThis as any).NSFW_ALLOWED || "false",
  };
}

loadConfig();

export const config = {
  get botToken() { return (globalThis as any).BOT_TOKEN ?? envCache.BOT_TOKEN ?? ""; },
  get adminTelegramId() { return Number((globalThis as any).ADMIN_TELEGRAM_ID ?? envCache.ADMIN_TELEGRAM_ID ?? 0); },
  get waifuApiKey() { return (globalThis as any).WAIFU_API_KEY ?? envCache.WAIFU_API_KEY ?? ""; },
  get nsfwAllowed() { return ((globalThis as any).NSFW_ALLOWED ?? envCache.NSFW_ALLOWED) === "true"; },
  waifuApiBase: "https://api.waifu.im",
  dbPath: "",
};
