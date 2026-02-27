import { homedir } from "node:os";
import { join } from "node:path";

export const PLUGIN_NAME = "message-transformer";

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode");

export const PATHS = {
  OPENCODE_CONFIG_DIR,
  GLOBAL_PLUGIN_DIR: join(OPENCODE_CONFIG_DIR, PLUGIN_NAME),
  GLOBAL_CONFIG_FILE: join(OPENCODE_CONFIG_DIR, PLUGIN_NAME, "config.jsonc"),
  LOG_DIR: join(OPENCODE_CONFIG_DIR, "logs", PLUGIN_NAME),
} as const;

export function getProjectPaths(projectDir: string) {
  const projectPluginDir = join(projectDir, ".opencode", PLUGIN_NAME);

  return {
    PROJECT_PLUGIN_DIR: projectPluginDir,
    PROJECT_CONFIG_FILE: join(projectPluginDir, "config.jsonc"),
  };
}
