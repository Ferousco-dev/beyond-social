/**
 * Behaviour checks for the Firecrawl client and trend extraction. Driven
 * against stubs, so no key and no network are needed.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/trends-smoke.ts
 */
import { Firecrawl, FirecrawlError } from "../src/lib/trends/firecrawl";
import { categoryIcon, categoryLabel, TREND_CATEGORIES } from "../src/lib/trends/categories";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

function stub(reply: () => Response): { fetch: typeof globalThis.fetch; bodies: string[] } {
  const bodies: string[] = [];
  const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ""));
    return reply();
  }) as typeof globalThis.fetch;
  return { fetch: fetchImpl, bodies };
}

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

async function main(): Promise<void> {
  // Scrape returns markdown, and prefers the canonical URL the crawler resolved.
  {
    const s = stub(() =>
      json({
        success: true,
        data: {
          markdown: "# Heading\ntext",
          metadata: { title: "T", sourceURL: "https://b.test" },
        },
      }),
    );
    const page = await new Firecrawl("key", s.fetch).scrape("https://a.test");
    check("scrape returns markdown", page?.markdown.includes("text") ?? false);
    check("scrape prefers the resolved url", page?.url === "https://b.test", page?.url ?? "");
    check("scrape asks for markdown only", s.bodies[0]?.includes('"markdown"') ?? false);
    check("scrape requests main content", s.bodies[0]?.includes("onlyMainContent") ?? false);
  }

  // A page with no text is not a failure, it is simply nothing to extract from.
  {
    const s = stub(() => json({ success: true, data: { markdown: "   " } }));
    check(
      "scrape returns null for an empty page",
      (await new Firecrawl("k", s.fetch).scrape("u")) === null,
    );
  }

  // An HTTP failure must surface with its status so the caller can tell a bad
  // key (401) from a rate limit (429).
  {
    const s = stub(() => new Response("nope", { status: 429 }));
    let status = 0;
    try {
      await new Firecrawl("k", s.fetch).scrape("u");
    } catch (error) {
      if (error instanceof FirecrawlError) status = error.status;
    }
    check("scrape surfaces the http status", status === 429, String(status));
  }

  // Search returns usable pages and drops the unusable ones rather than
  // yielding entries with no URL or no text.
  {
    const s = stub(() =>
      json({
        success: true,
        data: [
          { url: "https://a.test", title: "A", markdown: "body a" },
          { url: "https://b.test", title: "B", description: "desc b" },
          { title: "no url", markdown: "orphan" },
          { url: "https://d.test", title: "D" },
        ],
      }),
    );
    const pages = await new Firecrawl("k", s.fetch).search("q", 4);
    check("search keeps usable pages", pages.length === 2, `${pages.length} pages`);
    check("search falls back to the description", pages[1]?.markdown === "desc b");
    check("search drops a page with no url", !pages.some((p) => p.url === ""));
    check("search drops a page with no text", !pages.some((p) => p.markdown === ""));
    check("search passes the limit", s.bodies[0]?.includes('"limit":4') ?? false);
  }

  // A malformed body must not throw; discovery should degrade to finding nothing.
  {
    const s = stub(() => json({ unexpected: true }));
    check(
      "search tolerates an unexpected shape",
      (await new Firecrawl("k", s.fetch).search("q")).length === 0,
    );
  }

  // Categories are shared between discovery and the filter chips, so a label
  // must resolve for every id discovery can write.
  check(
    "every category has a label",
    TREND_CATEGORIES.every((c) => categoryLabel(c.id) === c.label),
  );
  check("unknown category falls back to its id", categoryLabel("unknown") === "unknown");
  check(
    "unknown category still has an icon",
    typeof categoryIcon("unknown") === "function" || typeof categoryIcon("unknown") === "object",
  );

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
