import { callLLM } from "../llm.js";
import { logger } from "../logger.js";
import type { TransformResult, TranslateTransformerConfig } from "../types.js";

export function createTranslateTransformer(config: TranslateTransformerConfig) {
  return async (text: string): Promise<TransformResult> => {
    if (!text.trim()) {
      return {
        transformed: false,
        text,
        transformerName: "translate",
      };
    }

    try {
      const systemPrompt = config.systemPrompt.replaceAll(
        "{{targetLanguage}}",
        config.targetLanguage,
      );
      const translated = await callLLM({
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        systemPrompt,
        userText: text,
      });

      if (!translated) {
        return {
          transformed: false,
          text,
          transformerName: "translate",
        };
      }

      return {
        transformed: translated !== text,
        text: translated,
        transformerName: "translate",
      };
    } catch (error) {
      logger.warn("Translate transformer failed, using original text", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        transformed: false,
        text,
        transformerName: "translate",
      };
    }
  };
}
