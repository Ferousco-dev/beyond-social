import { z } from "zod";

/**
 * Webhook vocabulary, shared by the form, the server actions, and the docs the
 * page renders. The signature constants live here rather than in the sender so
 * that what we document and what we eventually sign cannot drift apart: there
 * is one definition of the header name and the signed string.
 */

export const WEBHOOK_EVENTS = [
  "generation.completed",
  "generation.failed",
  "post.published",
  "post.failed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_LABELS: Readonly<Record<WebhookEvent, string>> = {
  "generation.completed": "A video finished rendering",
  "generation.failed": "A video failed to render",
  "post.published": "A post went live on a platform",
  "post.failed": "A post failed to publish",
};

/** Carries the timestamp and the digest, in the form `t=<unix>,v1=<hex>`. */
export const SIGNATURE_HEADER = "X-Beyond-Signature";

/** Duplicates the timestamp on its own so a proxy can reject stale calls cheaply. */
export const TIMESTAMP_HEADER = "X-Beyond-Timestamp";

/** Names the event, so a receiver can route without parsing the body. */
export const EVENT_HEADER = "X-Beyond-Event";

/**
 * How old a signature may be before a receiver should reject it.
 *
 * A signature with no time bound is valid forever, so anyone who captures one
 * request can replay it indefinitely. Five minutes is enough slack for ordinary
 * clock drift and not enough to be useful to an attacker holding a recording.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * The exact bytes that get signed: the timestamp, a full stop, then the raw
 * body. Signing the body alone would leave the timestamp unauthenticated, so an
 * attacker could replay an old body under a fresh timestamp and pass the
 * freshness check.
 */
export function signaturePayload(timestamp: number, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export const webhookEventSchema = z.enum(WEBHOOK_EVENTS);

export const createWebhookSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  events: z.array(webhookEventSchema).min(1).max(WEBHOOK_EVENTS.length),
});

export type CreateWebhookInput = z.input<typeof createWebhookSchema>;

/** What the browser is allowed to know about an endpoint. Never the secret. */
export interface WebhookSummary {
  id: string;
  url: string;
  events: readonly WebhookEvent[];
  secretLastFour: string;
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt: string | null;
  failureCount: number;
}
