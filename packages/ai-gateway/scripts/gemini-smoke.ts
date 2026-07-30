/**
 * Request-shape checks for the Gemini client.
 *
 * Gemini differs from the other providers in three ways that each fail
 * silently rather than loudly, so they are asserted rather than assumed.
 *
 *   tsx scripts/gemini-smoke.ts
 */
import { GeminiClient } from "../src/providers";
import { MODELS } from "../src/models";
import { ProviderError } from "../src/retry";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const spec = MODELS["gemini-2.5-flash"];
if (!spec) throw new Error("gemini-2.5-flash missing from the registry");

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function install(reply: () => Response): { calls: Captured[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return reply();
  }) as typeof globalThis.fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

const ok = () =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: "  hello  " }] } }],
      usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7 },
    }),
    { status: 200 },
  );

async function main(): Promise<void> {
  {
    const stub = install(ok);
    const result = await new GeminiClient("k").complete(spec, {
      system: "you are a director",
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "second" },
        { role: "user", content: "third" },
      ],
      temperature: 0.4,
      maxTokens: 100,
      json: true,
    });
    stub.restore();

    const call = stub.calls[0];
    const body = call?.body as {
      systemInstruction?: { parts?: { text?: string }[] };
      contents?: { role?: string; parts?: { text?: string }[] }[];
      generationConfig?: Record<string, unknown>;
    };

    // The system prompt is a top-level field, not a message. Sent as a message
    // it is silently treated as user text and the instruction is diluted.
    check(
      "system prompt is its own field",
      body.systemInstruction?.parts?.[0]?.text === "you are a director",
    );
    check(
      "system prompt is not a message",
      !JSON.stringify(body.contents).includes("you are a director"),
    );

    // Roles are user/model, not user/assistant. The wrong role is rejected or,
    // worse, reinterpreted.
    check(
      "assistant becomes model",
      body.contents?.[1]?.role === "model",
      body.contents?.[1]?.role ?? "",
    );
    check("user stays user", body.contents?.[0]?.role === "user");
    check("keeps message order", body.contents?.[2]?.parts?.[0]?.text === "third");

    // Content is an array of parts, not a string.
    check("content is parts", Array.isArray(body.contents?.[0]?.parts));

    check("passes temperature", body.generationConfig?.temperature === 0.4);
    check("asks for json", body.generationConfig?.responseMimeType === "application/json");
    check(
      "caps output to the model maximum",
      (body.generationConfig?.maxOutputTokens as number) === 100,
    );

    // The key belongs in a header: in a query string it lands in proxy logs.
    check("sends the key as a header", call?.headers["x-goog-api-key"] === "k");
    check(
      "key is not in the url",
      !(call?.url ?? "").includes("k&") && !(call?.url ?? "").includes("key="),
    );

    check("returns trimmed text", result.text === "hello", JSON.stringify(result.text));
    check("reads input tokens", result.inputTokens === 11);
    check("reads output tokens", result.outputTokens === 7);
  }

  // A safety block answers 200 with no candidate. Treating that as success
  // would store an empty video prompt and generate from nothing.
  {
    const stub = install(() => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    let terminal = false;
    try {
      await new GeminiClient("k").complete(spec, {
        system: "s",
        messages: [{ role: "user", content: "m" }],
      });
    } catch (error) {
      // 400 so the retry policy treats it as terminal: the same prompt will be
      // refused again.
      terminal = error instanceof ProviderError && error.status === 400;
    }
    stub.restore();
    check("a blocked response is a terminal error", terminal);
  }

  // A 429 must stay retryable so the gateway backs off rather than failing over.
  {
    const stub = install(
      () => new Response("slow down", { status: 429, headers: { "retry-after": "3" } }),
    );
    let status = 0;
    let retryAfter: number | null = null;
    try {
      await new GeminiClient("k").complete(spec, {
        system: "s",
        messages: [{ role: "user", content: "m" }],
      });
    } catch (error) {
      if (error instanceof ProviderError) {
        status = error.status;
        retryAfter = error.retryAfterSeconds;
      }
    }
    stub.restore();
    check("surfaces a 429", status === 429);
    check("honours retry-after", retryAfter === 3);
  }

  // Thinking tokens come out of the same budget as the answer. A thinking model
  // given only the caller's budget spends all of it reasoning and returns
  // nothing, with a finish reason that reads as success downstream.
  {
    const pro = MODELS["gemini-2.5-pro"];
    const stub = install(ok);
    await new GeminiClient("k").complete(pro!, {
      system: "s",
      messages: [{ role: "user", content: "m" }],
      maxTokens: 300,
    });
    stub.restore();
    const config = (stub.calls[0]?.body as { generationConfig?: Record<string, unknown> })
      .generationConfig;
    check(
      "pro requests its minimum thinking budget",
      (config?.thinkingConfig as { thinkingBudget?: number })?.thinkingBudget === 128,
    );
    check(
      "thinking budget is added to the answer budget",
      config?.maxOutputTokens === 428,
      String(config?.maxOutputTokens),
    );
  }
  {
    const flash = MODELS["gemini-2.5-flash"];
    const stub = install(ok);
    await new GeminiClient("k").complete(flash!, {
      system: "s",
      messages: [{ role: "user", content: "m" }],
      maxTokens: 300,
    });
    stub.restore();
    const config = (stub.calls[0]?.body as { generationConfig?: Record<string, unknown> })
      .generationConfig;
    check(
      "flash switches thinking off",
      (config?.thinkingConfig as { thinkingBudget?: number })?.thinkingBudget === 0,
    );
  }
  {
    // A model that declares no thinking budget must be sent no thinking field:
    // a non-thinking model rejects it outright. Built here rather than taken
    // from the registry, which currently has no such Gemini entry.
    const nonThinking = { ...spec, minThinkingTokens: undefined };
    const stub = install(ok);
    await new GeminiClient("k").complete(nonThinking, {
      system: "s",
      messages: [{ role: "user", content: "m" }],
    });
    stub.restore();
    const config = (stub.calls[0]?.body as { generationConfig?: Record<string, unknown> })
      .generationConfig;
    check("no thinking config for a non-thinking model", config?.thinkingConfig === undefined);
  }

  // Thinking tokens are billed as output but reported in their own field.
  {
    const stub = install(
      () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "hi" }] } }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 20,
              thoughtsTokenCount: 50,
            },
          }),
          { status: 200 },
        ),
    );
    const result = await new GeminiClient("k").complete(spec, {
      system: "s",
      messages: [{ role: "user", content: "m" }],
    });
    stub.restore();
    check(
      "counts thinking tokens as output",
      result.outputTokens === 70,
      String(result.outputTokens),
    );
  }

  // Truncation returned an empty string that read as a successful completion.
  {
    const stub = install(
      () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "" }] }, finishReason: "MAX_TOKENS" }],
          }),
          { status: 200 },
        ),
    );
    let status = 0;
    try {
      await new GeminiClient("k").complete(spec, {
        system: "s",
        messages: [{ role: "user", content: "m" }],
      });
    } catch (error) {
      if (error instanceof ProviderError) status = error.status;
    }
    stub.restore();
    // Retryable: a different budget may succeed, unlike a refusal.
    check("an empty answer is an error, not a completion", status === 503, String(status));
  }

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
