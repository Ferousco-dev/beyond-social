import {
  EVENT_HEADER,
  SIGNATURE_HEADER,
  SIGNATURE_TOLERANCE_SECONDS,
  TIMESTAMP_HEADER,
} from "@/lib/webhooks/types";

import { CopyButton } from "./copy-button";

const SNIPPET = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(rawBody, header, secret) {
  // header looks like: t=1730000000,v1=9f86d081...
  const parts = Object.fromEntries(
    header.split(",").map((part) => part.split("=").map((piece) => piece.trim())),
  );

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;

  // Reject anything older than the tolerance, or a captured request can be
  // replayed against you forever.
  if (Math.abs(Date.now() / 1000 - timestamp) > ${SIGNATURE_TOLERANCE_SECONDS}) return false;

  const expected = createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  // Constant time. A plain === leaks the digest one byte at a time.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1 ?? "", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}`;

const rowClass =
  "flex flex-col gap-0.5 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:gap-4";
const keyClass = "shrink-0 font-mono text-xs text-ink sm:w-56";
const valueClass = "text-xs leading-relaxed text-ink-soft";

/** How to verify a delivery. Written so a receiver can be implemented from it. */
export function SignatureDoc() {
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">Verifying a delivery</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
        Every request we send carries a signature made with your endpoint&apos;s secret. Check it
        before trusting the body. Anyone can POST to your URL, and the signature is the only thing
        that distinguishes us from them.
      </p>

      <dl className="mt-4">
        <div className={rowClass}>
          <dt className={keyClass}>{SIGNATURE_HEADER}</dt>
          <dd className={valueClass}>
            <code className="text-ink">t=&lt;unix seconds&gt;,v1=&lt;hex digest&gt;</code>. The
            digest is HMAC-SHA256, keyed with your signing secret.
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={keyClass}>Signed string</dt>
          <dd className={valueClass}>
            The timestamp, a full stop, then the <strong className="text-ink">raw</strong> request
            body: <code className="text-ink">{"`${t}.${rawBody}`"}</code>. Use the bytes exactly as
            received. Parsing the JSON and re-serialising it changes whitespace and key order, and
            the signature will not match.
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={keyClass}>{TIMESTAMP_HEADER}</dt>
          <dd className={valueClass}>
            The same timestamp on its own. Reject deliveries more than {SIGNATURE_TOLERANCE_SECONDS}{" "}
            seconds old. The timestamp is inside the signed string, so it cannot be altered without
            breaking the signature, and checking it is what stops a captured request being replayed
            at you later.
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={keyClass}>{EVENT_HEADER}</dt>
          <dd className={valueClass}>
            The event name, so you can route without parsing the body first.
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={keyClass}>Comparison</dt>
          <dd className={valueClass}>
            Compare digests in constant time. A byte-by-byte <code className="text-ink">===</code>{" "}
            returns faster on an earlier mismatch, which is enough to recover the expected signature
            one byte at a time.
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-ink">Node.js</h3>
        <CopyButton value={SNIPPET} label="Copy snippet" />
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-canvas p-3 text-[11px] leading-relaxed text-ink-soft">
        <code>{SNIPPET}</code>
      </pre>
    </section>
  );
}
