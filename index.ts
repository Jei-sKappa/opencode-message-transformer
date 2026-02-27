import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig } from "./src/config.js";
import type { ChatMessageInput, ChatMessageOutput } from "./src/hook-types.js";
import { logger } from "./src/logger.js";
import { createPipeline } from "./src/transformer.js";

export const MessageTransformerPlugin: Plugin = async (ctx) => {
  const config = loadConfig(ctx.directory);
  logger.debugEnabled = config.logging.debug;

  const pipeline = createPipeline(config);
  logger.debug("Message transformer plugin initialized", {
    projectDirectory: ctx.directory,
    debugLogging: config.logging.debug,
    translateEnabled: config.transformers.translate.enabled,
    improveEnabled: config.transformers.improve.enabled,
  });

  return {
    "chat.message": async (_input: ChatMessageInput, output: ChatMessageOutput) => {
      if (output.message.role !== "user") return;

      for (const part of output.parts) {
        if (part.ignored) continue;
        if (part.type !== "text") continue;
        if (typeof part.text !== "string") continue;

        const originalText = part.text;
        part.text = await pipeline.process(part.text);

        if (part.text !== originalText) {
          logger.debug("Message part transformed", {
            beforeLength: originalText.length,
            afterLength: part.text.length,
          });
        }
      }
    },
  };
};

export default MessageTransformerPlugin;
