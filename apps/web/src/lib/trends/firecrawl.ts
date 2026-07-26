import "server-only";

import { z } from "zod";

import { serverEnv } from "@/lib/server-env";

/**
 * Firecrawl client.
 *
 * Only the two calls we need: scrape one page to markdown, and search the web
 * for pages worth scraping. Kept deliberately thin, because the value is in
 * what we do with the text, not in wrapping their whole surface.
 */

const BASE = "https://api.firecrawl.dev/v1";

/** A slow scrape must not hold a discovery run open indefinitely. */
const TIMEOUT_MS = 45_000;

const scrapeResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .object({
      markdown: z.string().optional(),
      metadata: z
        .object({ title: z.string().optional(), sourceURL: z.string().optional() })
        .partial()
        .optional(),
    })
    .optional(),
  error: z.string().optional(),
});

const searchResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .array(
      z.object({
        url: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        markdown: z.string().optional(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

export interface ScrapedPage {
  readonly url: string;
  readonly title: string;
  readonly markdown: string;
}

export class FirecrawlError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FirecrawlError";
  }
}

export class Firecrawl {
  constructor(
    private readonly apiKey: string = serverEnv.FIRECRAWL_API_KEY,
    private readonly doFetch: typeof globalThis.fetch = globalThis.fetch,
  ) {}

  private async post(path: string, body: unknown): Promise<unknown> {
    const response = await this.doFetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new FirecrawlError(
        `Firecrawl ${path} failed (${response.status}): ${detail.slice(0, 200)}`,
        response.status,
      );
    }
    return response.json();
  }

  /** Fetches one page as markdown. Returns null when the page yields no text. */
  async scrape(url: string): Promise<ScrapedPage | null> {
    const parsed = scrapeResponseSchema.safeParse(
      await this.post("/scrape", { url, formats: ["markdown"], onlyMainContent: true }),
    );
    if (!parsed.success) return null;

    const markdown = parsed.data.data?.markdown?.trim();
    if (!markdown) return null;

    return {
      url: parsed.data.data?.metadata?.sourceURL ?? url,
      title: parsed.data.data?.metadata?.title ?? "",
      markdown,
    };
  }

  /** Searches the web and returns pages with their text already extracted. */
  async search(query: string, limit = 5): Promise<readonly ScrapedPage[]> {
    const parsed = searchResponseSchema.safeParse(
      await this.post("/search", {
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    );
    if (!parsed.success) return [];

    return (parsed.data.data ?? [])
      .map((item) => ({
        url: item.url ?? "",
        title: item.title ?? "",
        // Search results carry a description even when the scrape returns no
        // body, and a description is still worth extracting from.
        markdown: (item.markdown ?? item.description ?? "").trim(),
      }))
      .filter((page): page is ScrapedPage => page.url !== "" && page.markdown !== "");
  }
}
