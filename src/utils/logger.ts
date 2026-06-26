type LogLevel = "info" | "warn" | "error" | "debug";

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, ...args: unknown[]): void {
  console.log(`[${timestamp()}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  error: (...args: unknown[]) => log("error", ...args),
  debug: (...args: unknown[]) => log("debug", ...args),
};
