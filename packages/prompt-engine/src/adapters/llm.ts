import type { Llm, LlmCompleteParams } from "../ports";
import { postJson } from "./http";

interface AnthropicResponse {
  content: { type: string; text?: string }[];
}

/**
 * Claude via the Anthropic Messages API. Default generation model is the latest
 * Opus; callers pass a cheaper model (e.g. Sonnet) for the judge. Anthropic has
 * no strict JSON flag, so `json` is satisfied by the caller's prompt contract.
 */
export class ClaudeLlm implements Llm {
  constructor(
    private readonly apiKey: string,
    readonly model = "claude-opus-4-8",
    private readonly version = "2023-06-01",
  ) {}

  async complete(params: LlmCompleteParams): Promise<string> {
    const res = await postJson<AnthropicResponse>(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": this.apiKey, "anthropic-version": this.version },
      {
        model: this.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 1,
        system: params.system,
        messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      },
    );
    return res.content
      .map((block) => block.text ?? "")
      .join("")
      .trim();
  }
}

interface OpenAiChatResponse {
  choices: { message: { content: string } }[];
}

/** GPT via Chat Completions, a fallback behind the same interface. */
export class OpenAiLlm implements Llm {
  constructor(
    private readonly apiKey: string,
    readonly model = "gpt-4o",
  ) {}

  async complete(params: LlmCompleteParams): Promise<string> {
    const res = await postJson<OpenAiChatResponse>(
      "https://api.openai.com/v1/chat/completions",
      { authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        temperature: params.temperature ?? 1,
        ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
        ...(params.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: params.system },
          ...params.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      },
    );
    return (res.choices[0]?.message.content ?? "").trim();
  }
}
