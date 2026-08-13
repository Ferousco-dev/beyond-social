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

/**
 * A streamed completion.
 *
 * Text arrives in pieces and the totals arrive at the end, because the token
 * counts are only known once the provider has finished. Callers that want the
 * whole string wait for `done`; callers that want to show it as it lands read
 * the chunks.
 */
export interface StreamEvent {
  readonly type: "chunk" | "done";
  /** Present on `chunk`: the text to append. */
  readonly text?: string;
  /** Present on `done`: what the call actually cost. */
  readonly usage?: { inputTokens: number; outputTokens: number };
}

export interface ProviderClient {
  complete(spec: ModelSpec, request: CompletionRequest): Promise<CompletionResult>;
  /**
   * Optional. A provider without one still works everywhere `complete` is used,
   * and the gateway falls back to completing in full and emitting it as a
   * single chunk, so a caller never has to ask which providers can stream.
   */
  stream?(spec: ModelSpec, request: CompletionRequest): AsyncIterable<StreamEvent>;
}

/**
 * Reads an SSE body as lines.
 *
 * Both providers speak text/event-stream, and both can split a JSON payload
 * across two network chunks, so the buffer is held across reads rather than
 * parsed per chunk. Getting this wrong shows up as an occasional dropped token
 * under load and never in development.
 */
async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // The last piece may be half a line, so it stays in the buffer.
      buffer = lines.pop() ?? "";
      for (const line of lines) yield line.trim();
    }
    if (buffer.trim() !== "") yield buffer.trim();
  } finally {
    // Releases the connection when a caller stops reading early, which is what
    // a cancelled turn does.
    reader.cancel().catch(() => undefined);
  }
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

/** Only the fields the stream reader actually reads. */
interface AnthropicStreamEvent {
  type: string;
  delta?: { text?: string };
  message?: { usage?: { input_tokens?: number } };
  usage?: { output_tokens?: number };
  error?: { message?: string };
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

  /**
   * The same call with `stream: true`.
   *
   * Only two event types matter here. `content_block_delta` carries the text,
   * and `message_delta` carries the output token count, which Anthropic reports
   * at the end rather than per chunk. Input tokens come with `message_start`.
   * Everything else in the protocol is structure this does not need.
   */
  async *stream(spec: ModelSpec, request: CompletionRequest): AsyncIterable<StreamEvent> {
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
        stream: true,
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });

    if (!response.ok) throw await toProviderError(response);
    if (!response.body) throw new ProviderError("stream had no body", 502, null);

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const line of sseLines(response.body)) {
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (payload === "" || payload === "[DONE]") continue;

      let event: AnthropicStreamEvent;
      try {
        event = JSON.parse(payload) as AnthropicStreamEvent;
      } catch {
        // A payload that will not parse is one event lost, not a failed reply.
        continue;
      }

      if (event.type === "message_start") {
        inputTokens = event.message?.usage?.input_tokens ?? 0;
      } else if (event.type === "content_block_delta" && event.delta?.text) {
        yield { type: "chunk", text: event.delta.text };
      } else if (event.type === "message_delta") {
        outputTokens = event.usage?.output_tokens ?? outputTokens;
      } else if (event.type === "error") {
        throw new ProviderError(event.error?.message ?? "stream error", 502, null);
      }
    }

    yield { type: "done", usage: { inputTokens, outputTokens } };
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

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    /** Billed as output, but reported separately and excluded from the count above. */
    thoughtsTokenCount?: number;
  };
  error?: { message?: string };
}

/**
 * Google Gemini.
 *
 * Three things differ from the other providers and each one is a silent failure
 * if missed: the system prompt is its own top-level field rather than a message,
 * roles are `user` and `model` rather than `user` and `assistant`, and content
 * is an array of parts rather than a string.
 */
export class GeminiClient implements ProviderClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta",
  ) {}

  async complete(spec: ModelSpec, request: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/models/${spec.id}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Header rather than a query parameter, so the key cannot end up in a
        // proxy log or an error URL.
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: request.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: request.temperature ?? 1,
          // The thinking budget is added to the caller's budget rather than
          // taken from it. Without this a thinking model spends the whole
          // allowance reasoning and returns an empty answer with a MAX_TOKENS
          // finish reason, which reads as success everywhere downstream.
          maxOutputTokens: Math.min(
            (request.maxTokens ?? 4096) + (spec.minThinkingTokens ?? 0),
            spec.maxOutput,
          ),
          ...(spec.minThinkingTokens === undefined
            ? {}
            : { thinkingConfig: { thinkingBudget: spec.minThinkingTokens } }),
          ...(request.json && spec.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });

    if (!response.ok) throw await toProviderError(response);
    const data = (await response.json()) as GeminiResponse;

    // Gemini answers 200 with no candidate when a safety filter fires, so an ok
    // status is not on its own a completed call.
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new ProviderError(
        `gemini returned no candidate: ${data.error?.message ?? "blocked or empty"}`,
        // Not retryable: asking again produces the same refusal.
        400,
        null,
      );
    }

    // Multi-part answers are joined; a single part is the common case.
    const text = (candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    // An empty answer is a failure, not a completion. Returning "" here would
    // store an empty directed prompt and generate a video from nothing.
    if (text === "") {
      throw new ProviderError(
        `gemini returned no text (finishReason: ${candidate.finishReason ?? "unknown"})`,
        // Truncation may pass on a retry with a different budget; a refusal
        // will not. Truncation is the recoverable one, so it is retryable.
        candidate.finishReason === "MAX_TOKENS" ? 503 : 400,
        null,
      );
    }

    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output but reported separately, so they
      // are added in; otherwise the cost dashboard silently under-reports.
      outputTokens:
        (data.usageMetadata?.candidatesTokenCount ?? 0) +
        (data.usageMetadata?.thoughtsTokenCount ?? 0),
    };
  }
}
