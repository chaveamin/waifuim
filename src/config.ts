import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const envPath = resolve(import.meta.dirname ?? ".", "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {}

function getEnvVar(key: string): string {
  if (typeof globalThis !== "undefined" && (globalThis as any)[key]) {
    return String((globalThis as any)[key]);
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key]!;
  }
  return "";
}

export const config = {
  get botToken() {
    return getEnvVar("BOT_TOKEN");
  },
  get adminTelegramId() {
    return Number(getEnvVar("ADMIN_TELEGRAM_ID"));
  },
  get waifuApiKey() {
    return getEnvVar("WAIFU_API_KEY");
  },
  get nsfwAllowed() {
    return getEnvVar("NSFW_ALLOWED") === "true";
  },
  waifuApiBase: "https://api.waifu.im",
  dbPath: "waifuim.db",
};
