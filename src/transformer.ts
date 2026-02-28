import { logger } from "./logger.js";
import { createImproveTransformer } from "./transformers/improve.js";
import { createTranslateTransformer } from "./transformers/translate.js";
import type { PluginConfig, TransformerConfig, TransformResult } from "./types.js";

export interface TransformerPipeline {
  process(text: string): Promise<string>;
}

type TransformerHandler = (text: string) => Promise<TransformResult>;

interface PipelineOverrides {
  translate?: TransformerHandler;
  improve?: TransformerHandler;
}

interface TriggerDecision {
  shouldRun: boolean;
  text: string;
}

interface PlannedStep {
  name: "translate" | "improve";
  shouldRun: boolean;
}

function resolveTrigger(config: TransformerConfig, text: string): TriggerDecision {
  const trigger = config.trigger.trim();
  if (!trigger) {
    return { shouldRun: false, text };
  }

  const trimmedStart = text.trimStart();
  const triggerLower = trigger.toLowerCase();
  const trimmedLower = trimmedStart.toLowerCase();

  if (!trimmedLower.startsWith(triggerLower)) {
    return { shouldRun: false, text };
  }

  const remainder = trimmedStart.slice(trigger.length);
  if (remainder.length > 0 && !/^\s/.test(remainder)) {
    return { shouldRun: false, text };
  }

  if (!remainder.trim()) {
    return { shouldRun: false, text };
  }

  return {
    shouldRun: true,
    text: remainder.trimStart(),
  };
}

export function createPipeline(
  config: PluginConfig,
  overrides: PipelineOverrides = {},
): TransformerPipeline {
  const translate =
    overrides.translate ?? createTranslateTransformer(config.transformers.translate);
  const improve = overrides.improve ?? createImproveTransformer(config.transformers.improve);

  return {
    async process(inputText: string): Promise<string> {
      if (!inputText.trim()) return inputText;

      const plannedSteps: PlannedStep[] = [];
      let text = inputText;

      if (!config.transformers.translate.enabled) {
        plannedSteps.push({ name: "translate", shouldRun: false });
      } else if (config.transformers.translate.mode === "auto") {
        plannedSteps.push({ name: "translate", shouldRun: true });
      } else {
        const decision = resolveTrigger(config.transformers.translate, text);
        plannedSteps.push({ name: "translate", shouldRun: decision.shouldRun });
        if (decision.shouldRun) {
          text = decision.text;
        }
      }

      if (!config.transformers.improve.enabled) {
        plannedSteps.push({ name: "improve", shouldRun: false });
      } else if (config.transformers.improve.mode === "auto") {
        plannedSteps.push({ name: "improve", shouldRun: true });
      } else {
        const decision = resolveTrigger(config.transformers.improve, text);
        plannedSteps.push({ name: "improve", shouldRun: decision.shouldRun });
        if (decision.shouldRun) {
          text = decision.text;
        }
      }

      for (const step of plannedSteps) {
        if (!step.shouldRun) continue;

        if (step.name === "translate") {
          const result = await translate(text);
          if (result.error) {
            logger.warn("Translate transformer failed, preserving original message.", {
              error: result.error,
            });
            return inputText;
          }
          text = result.text;
          logger.debug("Translate transformer processed message", {
            transformed: result.transformed,
            outputLength: text.length,
          });
          continue;
        }

        const result = await improve(text);
        if (result.error) {
          logger.warn("Improve transformer failed, preserving original message.", {
            error: result.error,
          });
          return inputText;
        }
        text = result.text;
        logger.debug("Improve transformer processed message", {
          transformed: result.transformed,
          outputLength: text.length,
        });
      }

      return text;
    },
  };
}
