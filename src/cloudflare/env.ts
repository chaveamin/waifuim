import { Context } from "grammy";

export type D1Database = {
  prepare(sql: string): D1Statement;
  exec(sql: string): void;
};

export type D1Statement = {
  bind(...params: any[]): D1Statement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
};

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  ADMIN_TELEGRAM_ID: string;
  WAIFU_API_KEY: string;
  NSFW_ALLOWED: string;
}

let env: Env;

export function setEnv(e: Env) {
  env = e;
}

export function getEnv(): Env {
  return env;
}
