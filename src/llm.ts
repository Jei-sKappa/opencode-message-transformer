import { performance } from "node:perf_hooks";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { logger } from "./logger.js";
import type { LLMProvider } from "./types.js";

export interface CallLLMInput {
  provider: LLMProvider;
  model: string;
  temperature: number;
  systemPrompt: string;
  userText: string;
}

const openai = createOpenAI();
const anthropic = createAnthropic();
const google = createGoogleGenerativeAI();
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OR_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
});

function getModel(provider: LLMProvider, model: string) {
  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY && !process.env.OR_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY (or OR_API_KEY) for openrouter provider");
  }

  switch (provider) {
    case "openai":
      return openai(model);
    case "anthropic":
      return anthropic(model);
    case "google":
      return google(model);
    case "openrouter":
      return openrouter(model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export async function callLLM(input: CallLLMInput): Promise<string> {
  const start = performance.now();

  try {
    const model = getModel(input.provider, input.model);
    const { text } = await generateText({
      model,
      system: input.systemPrompt,
      prompt: input.userText,
      temperature: input.temperature,
    });

    const durationMs = performance.now() - start;
    logger.debug("LLM call completed", {
      provider: input.provider,
      model: input.model,
      durationMs: durationMs.toFixed(2),
      inputChars: input.userText.length,
      outputChars: text.length,
    });

    return text.trim();
  } catch (error) {
    const durationMs = performance.now() - start;
    logger.error("LLM call failed", {
      provider: input.provider,
      model: input.model,
      durationMs: durationMs.toFixed(2),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
