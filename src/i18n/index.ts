import { Context } from "grammy";
import { messages, type Lang } from "./messages.js";

const langCache = new Map<number, Lang>();

export function setLangCache(userId: number, lang: Lang) {
  langCache.set(userId, lang);
}

export function getLangCache(userId: number): Lang {
  return langCache.get(userId) ?? "en";
}

export function getLang(ctx: Context): Lang {
  const userId = ctx.from?.id;
  if (!userId) return "en";
  return langCache.get(userId) ?? "en";
}

export function t(key: string, lang: Lang): string {
  const entry = messages[key];
  if (!entry) return key;
  return entry[lang] ?? entry["en"] ?? key;
}

export function tr(key: string, ctx: Context): string {
  return t(key, getLang(ctx));
}

export function isRTL(lang: Lang): boolean {
  return lang === "fa";
}
