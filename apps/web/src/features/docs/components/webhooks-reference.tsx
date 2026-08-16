import { type ReactNode } from "react";

import {
  EVENT_HEADER,
  SIGNATURE_HEADER,
  SIGNATURE_TOLERANCE_SECONDS,
  TIMESTAMP_HEADER,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks/types";

import { Code, Section, Term } from "./doc-primitives";

/**
 * The webhook contract, documented from the constants the sender actually uses.
 *
 * The header names and the tolerance are imported rather than typed out, so a
 * change to the protocol cannot leave this page describing the old one.
 */

const PAYLOAD = `{
  "event": "generation.completed",
  "created_at": "2026-07-30T09:12:44.118Z",
  "data": {
    "generation_id": "8f1c9d2e-...",
    "result_url": "https://..."
  }
}`;

const VERIFY = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(rawBody, header, secret) {
  // header looks like: t=1730000000,v1=9f86d081...
  const parts = Object.fromEntries(
    header.split(",").map((part) => part.split("=").map((piece) => piece.trim())),
  );

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > ${SIGNATURE_TOLERANCE_SECONDS}) return false;

  const expected = createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  // Constant time. A plain === leaks the digest one byte at a time.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1 ?? "", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}`;

export function WebhooksReference(): ReactNode {
  return (
    <>
      <Section title="Webhooks">
        <p>
          An endpoint is registered in the dashboard under Settings, Webhooks. It must be HTTPS, and
          loopback, private, and link-local addresses are refused, because an endpoint we will POST
          to on your behalf is a request we can be pointed at anything with. Ten endpoints per
          account.
        </p>
        <p>
          The events are{" "}
          {WEBHOOK_EVENTS.map((event, index) => (
            <span key={event}>
              {index > 0 ? ", " : ""}
              <Term>{event}</Term>
            </span>
          ))}
          . The two generation events are being sent today. The post events exist and are not being
          sent yet, because scheduled publishing does not run anywhere yet; an endpoint subscribed
          to them will stay quiet rather than fail.
        </p>
        <Code>{PAYLOAD}</Code>
      </Section>

      <Section title="Verifying a delivery">
        <p>
          Every request carries a signature made with your endpoint&rsquo;s secret. Check it before
          trusting the body: anyone can POST to your URL, and the signature is the only thing that
          distinguishes us from them.
        </p>
        <p>
          <Term>{SIGNATURE_HEADER}</Term> is{" "}
          <Term>t=&lt;unix seconds&gt;,v1=&lt;hex digest&gt;</Term>, where the digest is HMAC-SHA256
          over <Term>&lt;timestamp&gt;.&lt;raw body&gt;</Term>, keyed with the secret. The timestamp
          is signed along with the body, so a captured request cannot be replayed under a fresh one.{" "}
          <Term>{TIMESTAMP_HEADER}</Term> repeats it on its own for cheap rejection at a proxy, and{" "}
          <Term>{EVENT_HEADER}</Term> names the event so you can route without parsing.
        </p>
        <p>
          Reject anything older than {SIGNATURE_TOLERANCE_SECONDS} seconds. A signature with no time
          bound is valid forever.
        </p>
        <Code>{VERIFY}</Code>
      </Section>

      <Section title="Delivery, retries, and secrets">
        <p>
          One attempt per endpoint, with a five second timeout. There is no retry queue yet, so
          treat a delivery as a prompt to reconcile rather than as the only copy of the news:{" "}
          <Term>GET /api/v1/generations</Term> is the source of truth. A failed or refused delivery
          increments the failure count shown beside the endpoint, and a success resets it.
        </p>
        <p>
          The signing secret is shown once, when the endpoint is created or the secret is rotated.
          It is stored encrypted rather than hashed, because signing needs the secret itself, and
          the key that decrypts it is held outside the database. Rotation is immediate and there is
          no overlap window, so update your receiver before rotating rather than after.
        </p>
      </Section>
    </>
  );
}
