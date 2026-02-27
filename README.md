# opencode-message-transformer

An OpenCode plugin that transforms user messages before they are sent to the model.

It currently supports two LLM-based transformers:

- `translate`: translates messages to a target language (default: English)
- `improve`: rewrites messages to be clearer and more concise

The plugin intercepts `chat.message` and mutates `output.parts[].text` in place. This means the transformed text is both what the user sees and what the model receives.

## Installation

```bash
bun add opencode-message-transformer
```

Then register it in your OpenCode config.

## Configuration

Configuration is loaded from JSONC files in this order:

1. Defaults embedded in the plugin
2. Global config: `~/.config/opencode/message-transformer/config.jsonc`
3. Project config: `.opencode/message-transformer/config.jsonc`

Project config overrides global config.

For local development in this repository, an example project config is included at `.opencode/message-transformer/config.jsonc`.

### Default config

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Jei-sKappa/opencode-message-transformer/main/schema/config.schema.json",
  "logging": { "debug": false },
  "transformers": {
    "translate": {
      "enabled": true,
      "mode": "auto",
      "trigger": "!translate",
      "targetLanguage": "English",
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
```

## Trigger modes

Each transformer has a `mode`:

- `auto`: runs on every eligible message
- `manual`: runs only when message starts with its `trigger` prefix (case-insensitive)

Examples:

- `translate` in `auto` mode: every message is translated to `targetLanguage`
- `improve` in `manual` mode with trigger `!improve`: `!improve this is hard read` triggers rewriting

Pipeline order is fixed:

1. `translate`
2. `improve`

So translated output can be improved afterward.

## Provider setup

The plugin uses Vercel AI SDK providers directly:

- OpenAI via `@ai-sdk/openai`
- Anthropic via `@ai-sdk/anthropic`
- Google via `@ai-sdk/google`
- OpenRouter via `@ai-sdk/openai` (OpenAI-compatible API)

Set the corresponding API keys in your environment (for example: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`).

For OpenRouter, set `provider` to `openrouter` and use an OpenRouter model ID (for example `openai/gpt-4o-mini` or `anthropic/claude-3.5-sonnet`).

## Custom system prompts

- `translate.systemPrompt` supports `{{targetLanguage}}` interpolation.
- `improve.systemPrompt` is used as-is.

Both prompts should instruct the model to return only transformed text.

## Development

```bash
bun install
bun run test
bun run typecheck
bun run build
bun run format:check
```

## Schema

JSON Schema for editor autocomplete lives in `schema/config.schema.json`.
