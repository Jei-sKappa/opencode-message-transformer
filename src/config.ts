import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseJsonc } from "jsonc-parser";
import { getProjectPaths, PATHS } from "./constants.js";
import { logger } from "./logger.js";
import type {
  ImproveTransformerConfig,
  LLMProvider,
  PluginConfig,
  TranslateTransformerConfig,
  TriggerMode,
} from "./types.js";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type RawPluginConfig = DeepPartial<PluginConfig>;

export const DEFAULT_CONFIG: PluginConfig = {
  logging: {
    debug: false,
  },
  transformers: {
    translate: {
      enabled: true,
      mode: "auto",
      trigger: "!translate",
      targetLanguage: "English",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.3,
      systemPrompt:
        "You are a translator. Translate the following user message to {{targetLanguage}}. Return ONLY the translated text, no explanations. If already in {{targetLanguage}}, return unchanged.",
    },
    improve: {
      enabled: false,
      mode: "manual",
      trigger: "!improve",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.5,
      systemPrompt:
        "You are a writing assistant. Improve the following message to be clearer, more concise, and better structured. Maintain the original intent and technical accuracy. Return ONLY the improved text.",
    },
  },
};

const DEFAULT_CONFIG_CONTENT = `{
  // JSON Schema for editor autocompletion
  "$schema": "https://raw.githubusercontent.com/Jei-sKappa/opencode-message-transformer/main/schema/config.schema.json",

  "logging": {
    // Enable plugin debug logging
    // Logs are written to ~/.config/opencode/logs/message-transformer/daily/
    // Default: false
    "debug": false
  },

  "transformers": {
    "translate": {
      // Enable/disable the transformer
      "enabled": true,
      // auto: run for every message; manual: run only with trigger prefix
      "mode": "auto",
      // Prefix for manual mode (case-insensitive)
      "trigger": "!translate",
      // Target language used in the translation prompt
      "targetLanguage": "English",
      // openai | anthropic | google | openrouter
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.3,
      "systemPrompt": "You are a translator. Translate the following user message to {{targetLanguage}}. Return ONLY the translated text, no explanations. If already in {{targetLanguage}}, return unchanged."
    },
    "improve": {
      "enabled": false,
      "mode": "manual",
      "trigger": "!improve",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.5,
      "systemPrompt": "You are a writing assistant. Improve the following message to be clearer, more concise, and better structured. Maintain the original intent and technical accuracy. Return ONLY the improved text."
    }
  }
}
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function asTemperature(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(2, value));
}

function asTriggerMode(value: unknown, fallback: TriggerMode): TriggerMode {
  if (value === "auto" || value === "manual") return value;
  return fallback;
}

function asProvider(value: unknown, fallback: LLMProvider): LLMProvider {
  if (value === "openai" || value === "anthropic" || value === "google" || value === "openrouter") {
    return value;
  }
  return fallback;
}

function parseJsoncFile(filePath: string): RawPluginConfig {
  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseJsonc(content);

    if (isRecord(parsed)) {
      return parsed as RawPluginConfig;
    }

    logger.warn("Config file has invalid top-level structure", { filePath });
    return {};
  } catch (error) {
    logger.warn("Failed to parse config file", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

function mergeTranslateConfig(
  base: TranslateTransformerConfig,
  raw: DeepPartial<TranslateTransformerConfig> | undefined,
): TranslateTransformerConfig {
  return {
    enabled: asBoolean(raw?.enabled, base.enabled),
    mode: asTriggerMode(raw?.mode, base.mode),
    trigger: asString(raw?.trigger, base.trigger),
    provider: asProvider(raw?.provider, base.provider),
    model: asString(raw?.model, base.model),
    temperature: asTemperature(raw?.temperature, base.temperature),
    systemPrompt: asString(raw?.systemPrompt, base.systemPrompt),
    targetLanguage: asString(raw?.targetLanguage, base.targetLanguage),
  };
}

function mergeImproveConfig(
  base: ImproveTransformerConfig,
  raw: DeepPartial<ImproveTransformerConfig> | undefined,
): ImproveTransformerConfig {
  return {
    enabled: asBoolean(raw?.enabled, base.enabled),
    mode: asTriggerMode(raw?.mode, base.mode),
    trigger: asString(raw?.trigger, base.trigger),
    provider: asProvider(raw?.provider, base.provider),
    model: asString(raw?.model, base.model),
    temperature: asTemperature(raw?.temperature, base.temperature),
    systemPrompt: asString(raw?.systemPrompt, base.systemPrompt),
  };
}

function mergeConfig(base: PluginConfig, raw: RawPluginConfig): PluginConfig {
  return {
    logging: {
      debug: asBoolean(raw.logging?.debug, base.logging.debug),
    },
    transformers: {
      translate: mergeTranslateConfig(base.transformers.translate, raw.transformers?.translate),
      improve: mergeImproveConfig(base.transformers.improve, raw.transformers?.improve),
    },
  };
}

function ensureGlobalConfigExists(): void {
  if (!existsSync(PATHS.GLOBAL_PLUGIN_DIR)) {
    mkdirSync(PATHS.GLOBAL_PLUGIN_DIR, { recursive: true });
  }

  if (!existsSync(PATHS.GLOBAL_CONFIG_FILE)) {
    writeFileSync(PATHS.GLOBAL_CONFIG_FILE, DEFAULT_CONFIG_CONTENT, "utf-8");
  }
}

export function getGlobalConfigPath(): string {
  return PATHS.GLOBAL_CONFIG_FILE;
}

export function getProjectConfigPath(projectDir: string): string {
  return getProjectPaths(projectDir).PROJECT_CONFIG_FILE;
}

export function loadConfig(projectDir?: string): PluginConfig {
  ensureGlobalConfigExists();

  let config = structuredClone(DEFAULT_CONFIG);

  if (existsSync(PATHS.GLOBAL_CONFIG_FILE)) {
    const globalConfig = parseJsoncFile(PATHS.GLOBAL_CONFIG_FILE);
    config = mergeConfig(config, globalConfig);
    logger.debug("Loaded global config", { path: PATHS.GLOBAL_CONFIG_FILE });
  }

  if (projectDir) {
    const projectPaths = getProjectPaths(projectDir);
    if (existsSync(projectPaths.PROJECT_CONFIG_FILE)) {
      const projectConfig = parseJsoncFile(projectPaths.PROJECT_CONFIG_FILE);
      config = mergeConfig(config, projectConfig);
      logger.debug("Loaded project config", { path: projectPaths.PROJECT_CONFIG_FILE });
    }
  }

  logger.debug("Final plugin config resolved", {
    loggingDebug: config.logging.debug,
    translateEnabled: config.transformers.translate.enabled,
    translateMode: config.transformers.translate.mode,
    improveEnabled: config.transformers.improve.enabled,
    improveMode: config.transformers.improve.mode,
  });

  return config;
}
