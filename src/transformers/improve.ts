import { callLLM } from "../llm.js";
import { logger } from "../logger.js";
import type { ImproveTransformerConfig, TransformResult } from "../types.js";

export function createImproveTransformer(config: ImproveTransformerConfig) {
  return async (text: string): Promise<TransformResult> => {
    if (!text.trim()) {
      return {
        transformed: false,
        text,
        transformerName: "improve",
      };
    }

    try {
      const improved = await callLLM({
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        systemPrompt: config.systemPrompt,
        userText: text,
      });

      if (!improved) {
        return {
          transformed: false,
          text,
          transformerName: "improve",
        };
      }

      return {
        transformed: improved !== text,
        text: improved,
        transformerName: "improve",
      };
    } catch (error) {
      return {
        transformed: false,
        text,
        transformerName: "improve",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}
