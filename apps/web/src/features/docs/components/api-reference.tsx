import { type ReactNode } from "react";

import { INTEGRATIONS_PLAN } from "@/lib/billing/entitlements";
import { PLAN_CATALOGUE } from "@/lib/billing/plans";

import { Code, Section, Term } from "./doc-primitives";

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
      "error": null,
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

/** The REST half: keys, endpoints, limits, and what goes wrong. */
export function ApiReference(): ReactNode {
  const plan = PLAN_CATALOGUE[INTEGRATIONS_PLAN].name;

  return (
    <>
      <Section title="Authentication">
        <p>
          Every request carries an API key as a bearer token. Keys are created in the dashboard
          under Settings, API keys, and they begin with <Term>bsk_</Term>.
        </p>
        <p>
          The key is shown once, when it is created. Only a SHA-256 hash of it is stored, so we
          cannot show it to you again and a database dump yields nothing usable. If you lose one,
          revoke it and make another. Revoking records a timestamp rather than deleting the row, so
          the key stays visible in your history as revoked.
        </p>
        <p>
          A request without a valid key returns 401. Keys belonging to a deleted account stop
          working at the moment of deletion, before the grace period ends.
        </p>
        <p>
          The integration surfaces, meaning this API, webhooks, and MCP, are part of the {plan}{" "}
          plan. A valid key on a lower plan returns 403 <Term>upgrade_required</Term> rather than
          401: the credential is fine, the plan is not, and the two have different remedies. The
          plan is checked on every request, so a key made while subscribed stops working if the
          subscription does.
        </p>
      </Section>

      <Section title="Base URL and endpoints">
        <p>
          The base URL is <Term>https://beyondsocial.app/api/v1</Term>. There are two authenticated
          REST endpoints, both GET, and one MCP endpoint at <Term>POST /api/mcp</Term>. Nothing
          writes: you cannot start a generation or schedule a post over the API today.
        </p>
        <p>
          A machine-readable description lives at <Term>GET /api/v1/openapi</Term>. It is OpenAPI
          3.1 and needs no key, because a spec you need a key to read cannot help you decide whether
          to get one.
        </p>
      </Section>

      <Section title="List generations">
        <p>
          <Term>GET /generations</Term> returns your generations, newest first. The optional{" "}
          <Term>limit</Term> parameter takes an integer from 1 to 100 and defaults to 20. A value
          outside that range returns 400 rather than being clamped.
        </p>
        <Code>{LIST_EXAMPLE}</Code>
        <Code>{LIST_RESPONSE}</Code>
        <p>
          <Term>status</Term> is one of <Term>queued</Term>, <Term>generating</Term>,{" "}
          <Term>ready</Term>, <Term>failed</Term>, or <Term>cancelled</Term>.{" "}
          <Term>result_url</Term> is null until a run is ready, and is a signed link that expires
          about an hour after it is issued, so fetch the video rather than storing the URL.{" "}
          <Term>error</Term> carries the provider&rsquo;s reason on a run that did not finish, and
          is null otherwise. There is no cursor, so this reads the recent tail rather than the full
          history.
        </p>
      </Section>

      <Section title="Get usage">
        <p>
          <Term>GET /usage</Term> rolls up your AI usage over the last 30 days. The window is fixed
          and takes no parameters.
        </p>
        <Code>{USAGE_EXAMPLE}</Code>
        <Code>{USAGE_RESPONSE}</Code>
        <p>
          An account with no recorded usage in the window gets the same shape back with every field
          at zero, not an empty body, so you can read the fields without checking first.{" "}
          <Term>cost_usd</Term> is provider cost, not credits, so it will not match the credit
          figures on your billing page.
        </p>
      </Section>

      <Section title="Rate limits">
        <p>
          Requests are metered per key owner with a token bucket: 60 requests of burst, refilling at
          one per second. Going over returns 429 with a <Term>Retry-After</Term> header in seconds.
          Obey the header rather than a fixed backoff of your own. MCP calls draw on the same
          bucket, because they are the same account reading the same data.
        </p>
        <p>
          The limiter runs in-process, so across more than one instance the effective ceiling is
          approximate rather than exact.
        </p>
      </Section>

      <Section title="Errors">
        <p>
          Errors are JSON with an <Term>error</Term> code and usually a human-readable{" "}
          <Term>message</Term>. The codes are <Term>invalid_request</Term> (400),{" "}
          <Term>unauthorized</Term> (401), <Term>upgrade_required</Term> (403),{" "}
          <Term>rate_limited</Term> (429), <Term>unavailable</Term> (503), and{" "}
          <Term>server_error</Term> (500).
        </p>
        <p>
          The 503 is a kill switch, so the API can be taken down without a deploy. It guards{" "}
          <Term>GET /generations</Term> and <Term>POST /api/mcp</Term>, the endpoints that touch
          real data.
        </p>
        <p>
          A 500 carries a <Term>trace_id</Term>. Quote it when you report the failure and we can
          find the exact log line instead of searching around a timestamp.
        </p>
      </Section>
    </>
  );
}
