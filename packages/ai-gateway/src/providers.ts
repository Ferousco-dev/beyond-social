import { type ModelSpec } from "./models";
import { ProviderError } from "./retry";

/**
 * Provider adapters. Each returns text plus the provider's own token counts,
 * which is what makes cost accounting exact rather than estimated.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: readonly ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderClient {
  complete(spec: ModelSpec, request: CompletionRequest): Promise<CompletionResult>;
}

/** Turns a non-2xx response into a classified error the retry policy understands. */
async function toProviderError(response: Response): Promise<ProviderError> {
  const body = await response.text().catch(() => "");
  const header = response.headers.get("retry-after");
  const retryAfter = header === null ? null : Number.parseFloat(header);
  return new ProviderError(
    `${response.status} ${body.slice(0, 300)}`,
    response.status,
    Number.isFinite(retryAfter) ? retryAfter : null,
  );
}

interface AnthropicResponse {
  content: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class AnthropicClient implements ProviderClient {
  constructor(
    private readonly apiKey: string,
    private readonly version = "2023-06-01",
  ) {}

  async complete(spec: ModelSpec, request: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": this.version,
      },
      body: JSON.stringify({
        model: spec.id,
        max_tokens: Math.min(request.maxTokens ?? 4096, spec.maxOutput),
        temperature: request.temperature ?? 1,
        system: request.system,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });

    if (!response.ok) throw await toProviderError(response);
    const data = (await response.json()) as AnthropicResponse;
    return {
      text: data.content
        .map((block) => block.text ?? "")
        .join("")
        .trim(),
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }
}

interface OpenAiResponse {
  choices: { message: { content: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAiClient implements ProviderClient {
  constructor(private readonly apiKey: string) {}

  async complete(spec: ModelSpec, request: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: spec.id,
        temperature: request.temperature ?? 1,
        max_tokens: Math.min(request.maxTokens ?? 4096, spec.maxOutput),
        ...(request.json && spec.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: request.system },
          ...request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });

    if (!response.ok) throw await toProviderError(response);
    const data = (await response.json()) as OpenAiResponse;
    return {
      text: (data.choices[0]?.message.content ?? "").trim(),
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
