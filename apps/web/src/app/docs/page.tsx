import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Documentation" };

/** One documented topic. Real headings, so the page can be scanned by keyboard and by screen reader. */
function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-hairline pt-8 first:border-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: string }): ReactNode {
  return (
    <pre className="overflow-x-auto rounded-lg border border-hairline bg-paper p-4 text-[13px] leading-relaxed text-ink-soft">
      <code>{children}</code>
    </pre>
  );
}

const LIST_EXAMPLE = `curl "https://beyondsocial.app/api/v1/generations?limit=5" \\
  -H "Authorization: Bearer bsk_your_key_here"`;

const LIST_RESPONSE = `{
  "object": "list",
  "data": [
    {
      "id": "8f1c9d2e-...",
      "prompt": "Slow push in on a rain-lit street at night",
      "status": "ready",
      "result_url": "https://...",
      "aspect_ratio": "9:16",
      "created_at": "2026-07-30T09:12:44.118Z"
    }
  ]
}`;

const USAGE_EXAMPLE = `curl https://beyondsocial.app/api/v1/usage \\
  -H "Authorization: Bearer bsk_your_key_here"`;

const USAGE_RESPONSE = `{
  "object": "usage",
  "period_days": 30,
  "data": {
    "calls": 128,
    "cached_calls": 31,
    "failed_calls": 2,
    "input_tokens": 94210,
    "output_tokens": 20884,
    "cost_usd": 3.42,
    "p50_latency_ms": 1180
  }
}`;

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Documentation"
      lede="The public API as it exists today. It is read-only and it is small, so this page documents all of it rather than a preview of something larger."
    >
      <div className="flex flex-col gap-10">
        <Section title="Authentication">
          <p>
            Every request carries an API key as a bearer token. Keys are created in the dashboard
            under Settings, API keys, and they begin with <code className="text-ink">bsk_</code>.
          </p>
          <p>
            The key is shown once, when it is created. Only a SHA-256 hash of it is stored, so we
            cannot show it to you again and a database dump yields nothing usable. If you lose one,
            revoke it and make another. Revoking records a timestamp rather than deleting the row,
            so the key stays visible in your history as revoked.
          </p>
          <p>
            A request without a valid key returns 401. Keys belonging to a deleted account stop
            working at the moment of deletion, before the grace period ends.
          </p>
        </Section>

        <Section title="Base URL and endpoints">
          <p>
            The base URL is <code className="text-ink">https://beyondsocial.app/api/v1</code>. There
            are two authenticated endpoints, both GET. Nothing writes: you cannot start a generation
            or schedule a post over the API today.
          </p>
          <p>
            A machine-readable description lives at{" "}
            <code className="text-ink">GET /api/v1/openapi</code>. It is OpenAPI 3.1 and needs no
            key, because a spec you need a key to read cannot help you decide whether to get one.
          </p>
        </Section>

        <Section title="List generations">
          <p>
            <code className="text-ink">GET /generations</code> returns your generations, newest
            first. The optional <code className="text-ink">limit</code> parameter takes an integer
            from 1 to 100 and defaults to 20. A value outside that range returns 400 rather than
            being clamped.
          </p>
          <Code>{LIST_EXAMPLE}</Code>
          <Code>{LIST_RESPONSE}</Code>
          <p>
            <code className="text-ink">status</code> is one of{" "}
            <code className="text-ink">queued</code>, <code className="text-ink">generating</code>,{" "}
            <code className="text-ink">ready</code>, or <code className="text-ink">failed</code>.{" "}
            <code className="text-ink">result_url</code> is null until a run is ready, and is a
            signed link that expires about an hour after it is issued, so fetch the video rather
            than storing the URL. There is no cursor, so this reads the recent tail rather than the
            full history.
          </p>
        </Section>

        <Section title="Get usage">
          <p>
            <code className="text-ink">GET /usage</code> rolls up your AI usage over the last 30
            days. The window is fixed and takes no parameters.
          </p>
          <Code>{USAGE_EXAMPLE}</Code>
          <Code>{USAGE_RESPONSE}</Code>
          <p>
            An account with no recorded usage in the window gets the same shape back with every
            field at zero, not an empty body, so you can read the fields without checking first.{" "}
            <code className="text-ink">cost_usd</code> is provider cost, not credits, so it will not
            match the credit figures on your billing page.
          </p>
        </Section>

        <Section title="Rate limits">
          <p>
            Requests are metered per key owner with a token bucket: 60 requests of burst, refilling
            at one per second. Going over returns 429 with a{" "}
            <code className="text-ink">Retry-After</code> header in seconds. Obey the header rather
            than a fixed backoff of your own.
          </p>
          <p>
            The limiter runs in-process, so across more than one instance the effective ceiling is
            approximate rather than exact.
          </p>
        </Section>

        <Section title="Errors">
          <p>
            Errors are JSON with an <code className="text-ink">error</code> code and usually a
            human-readable <code className="text-ink">message</code>. The codes are{" "}
            <code className="text-ink">invalid_request</code> (400),{" "}
            <code className="text-ink">unauthorized</code> (401),{" "}
            <code className="text-ink">rate_limited</code> (429),{" "}
            <code className="text-ink">unavailable</code> (503), and{" "}
            <code className="text-ink">server_error</code> (500).
          </p>
          <p>
            The 503 is a kill switch, so the API can be taken down without a deploy. It currently
            guards <code className="text-ink">GET /generations</code> only, which is the endpoint
            that touches real data.
          </p>
          <p>
            A 500 carries a <code className="text-ink">trace_id</code>. Quote it when you report the
            failure and we can find the exact log line instead of searching around a timestamp.
          </p>
        </Section>
      </div>

      <div className="mt-12">
        <Prose>
          <p>
            If anything here does not match what the API returns, that is a bug in this page and we
            want to know: hello@beyondsocial.app.
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
