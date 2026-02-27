import { describe, expect, it } from "bun:test";
import { createPipeline } from "./transformer.js";
import type { PluginConfig, TransformResult } from "./types.js";

function createConfig(): PluginConfig {
  return {
    logging: { debug: false },
    transformers: {
      translate: {
        enabled: true,
        mode: "auto",
        trigger: "!translate",
        targetLanguage: "English",
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.3,
        systemPrompt: "translate",
      },
      improve: {
        enabled: true,
        mode: "auto",
        trigger: "!improve",
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.5,
        systemPrompt: "improve",
      },
    },
  };
}

function createMockTransformer(
  name: "translate" | "improve",
  calls: string[],
  formatter: (text: string) => string,
) {
  return async (text: string): Promise<TransformResult> => {
    calls.push(`${name}:${text}`);
    return {
      transformed: true,
      text: formatter(text),
      transformerName: name,
    };
  };
}

describe("transformer pipeline", () => {
  it("runs translate before improve in auto mode", async () => {
    const config = createConfig();
    const calls: string[] = [];

    const pipeline = createPipeline(config, {
      translate: createMockTransformer("translate", calls, (text) => `translated(${text})`),
      improve: createMockTransformer("improve", calls, (text) => `improved(${text})`),
    });

    const result = await pipeline.process("hola mundo");

    expect(result).toBe("improved(translated(hola mundo))");
    expect(calls).toEqual(["translate:hola mundo", "improve:translated(hola mundo)"]);
  });

  it("matches manual trigger case-insensitively and strips it", async () => {
    const config = createConfig();
    config.transformers.translate.mode = "manual";
    config.transformers.improve.enabled = false;

    const calls: string[] = [];
    const pipeline = createPipeline(config, {
      translate: createMockTransformer("translate", calls, (text) => `translated(${text})`),
    });

    const result = await pipeline.process("  !TrAnSlAtE   bonjour");

    expect(result).toBe("translated(bonjour)");
    expect(calls).toEqual(["translate:bonjour"]);
  });

  it("does not match manual trigger when it is only a prefix fragment", async () => {
    const config = createConfig();
    config.transformers.translate.mode = "manual";
    config.transformers.improve.enabled = false;

    const calls: string[] = [];
    const pipeline = createPipeline(config, {
      translate: createMockTransformer("translate", calls, (text) => `translated(${text})`),
    });

    const input = "!translatebonjour";
    const result = await pipeline.process(input);

    expect(result).toBe(input);
    expect(calls).toEqual([]);
  });

  it("resolves both manual triggers before executing ordered steps", async () => {
    const config = createConfig();
    config.transformers.translate.mode = "manual";
    config.transformers.improve.mode = "manual";

    const calls: string[] = [];
    const pipeline = createPipeline(config, {
      translate: createMockTransformer("translate", calls, (text) => `translated(${text})`),
      improve: createMockTransformer("improve", calls, (text) => `improved(${text})`),
    });

    const result = await pipeline.process("!translate !improve hola");

    expect(result).toBe("improved(translated(hola))");
    expect(calls).toEqual(["translate:hola", "improve:translated(hola)"]);
  });

  it("lets manual improve trigger work when translate is auto", async () => {
    const config = createConfig();
    config.transformers.translate.mode = "auto";
    config.transformers.improve.mode = "manual";

    const calls: string[] = [];
    const pipeline = createPipeline(config, {
      translate: createMockTransformer("translate", calls, (text) => `translated(${text})`),
      improve: createMockTransformer("improve", calls, (text) => `improved(${text})`),
    });

    const result = await pipeline.process("!improve hola");

    expect(result).toBe("improved(translated(hola))");
    expect(calls).toEqual(["translate:hola", "improve:translated(hola)"]);
  });
});
