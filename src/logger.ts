import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PATHS } from "./constants.js";

export class Logger {
  private readonly logDir: string;
  debugEnabled: boolean;

  constructor(logDirOverride?: string, debugEnabled = false) {
    this.logDir = logDirOverride ?? PATHS.LOG_DIR;
    this.debugEnabled = debugEnabled;
  }

  private ensureLogDir() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatData(data?: Record<string, unknown>): string {
    if (!data) return "";

    const parts: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        parts.push(
          `${key}=[${value.slice(0, 3).join(",")}${value.length > 3 ? `...+${value.length - 3}` : ""}]`,
        );
        continue;
      }

      if (typeof value === "object") {
        const serialized = JSON.stringify(value);
        if (serialized.length < 80) {
          parts.push(`${key}=${serialized}`);
        }
        continue;
      }

      parts.push(`${key}=${value}`);
    }

    return parts.join(" ");
  }

  private getCallerFile(): string {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
      const err = new Error();
      Error.prepareStackTrace = (_, stack) => stack;
      const stack = err.stack as unknown as NodeJS.CallSite[];
      Error.prepareStackTrace = originalPrepareStackTrace;

      for (let index = 3; index < stack.length; index += 1) {
        const filename = stack[index]?.getFileName();
        if (filename && !filename.includes("logger.")) {
          const match = filename.match(/([^/\\]+)\.[tj]s$/);
          return match ? match[1] : "unknown";
        }
      }

      return "unknown";
    } catch {
      return "unknown";
    }
  }

  private write(level: string, component: string, message: string, data?: Record<string, unknown>) {
    if (level === "DEBUG" && !this.debugEnabled) return;

    try {
      this.ensureLogDir();

      const timestamp = new Date().toISOString();
      const dataStr = this.formatData(data);
      const dailyLogDir = join(this.logDir, "daily");

      if (!existsSync(dailyLogDir)) {
        mkdirSync(dailyLogDir, { recursive: true });
      }

      const logLine = `${timestamp} ${level.padEnd(5)} ${component}: ${message}${dataStr ? ` | ${dataStr}` : ""}\n`;
      const logFile = join(dailyLogDir, `${new Date().toISOString().split("T")[0]}.log`);

      writeFileSync(logFile, logLine, { flag: "a" });
    } catch {
      // Logging never interrupts plugin behavior.
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.write("INFO", this.getCallerFile(), message, data);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.write("DEBUG", this.getCallerFile(), message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.write("WARN", this.getCallerFile(), message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.write("ERROR", this.getCallerFile(), message, data);
  }
}

export const logger = new Logger();
