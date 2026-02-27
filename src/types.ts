export type LLMProvider = "openai" | "anthropic" | "google" | "openrouter";

export type TriggerMode = "auto" | "manual";

export interface TransformerConfig {
  enabled: boolean;
  mode: TriggerMode;
  trigger: string;
  provider: LLMProvider;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface TranslateTransformerConfig extends TransformerConfig {
  targetLanguage: string;
}

export interface ImproveTransformerConfig extends TransformerConfig {}

export interface PluginConfig {
  logging: {
    debug: boolean;
  };
  transformers: {
    translate: TranslateTransformerConfig;
    improve: ImproveTransformerConfig;
  };
}

export interface TransformResult {
  transformed: boolean;
  text: string;
  transformerName: "translate" | "improve";
}
