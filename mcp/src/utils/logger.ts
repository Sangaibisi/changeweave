type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: string): void {
  if (level in LEVEL_ORDER) {
    currentLevel = level as LogLevel;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("debug")) {
      console.error(formatMessage("debug", message, meta));
    }
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("info")) {
      console.error(formatMessage("info", message, meta));
    }
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("warn")) {
      console.error(formatMessage("warn", message, meta));
    }
  },
  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};
