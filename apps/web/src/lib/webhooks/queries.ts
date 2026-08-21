import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { WEBHOOK_EVENTS, type WebhookEvent, type WebhookSummary } from "./types";

function toEvents(raw: readonly string[]): WebhookEvent[] {
  // The column is `text[]`, so the database's own check constraint is what
  // keeps it to known values. Narrowing here rather than casting means a value
  // retired from the union later degrades to a missing row, not a broken render.
  const known = new Set<string>(WEBHOOK_EVENTS);
  return raw.filter((event): event is WebhookEvent => known.has(event));
}

/**
 * The caller's endpoints, newest first. RLS restricts this to their own rows.
 *
 * Columns are named explicitly because they have to be: `secret_encrypted` is
 * revoked from `authenticated` at the column level, so `select *` fails outright
 * for a signed-in user rather than quietly returning the ciphertext.
 */
export async function getWebhooks(): Promise<WebhookSummary[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_webhooks")
    .select(
      "id, url, events, secret_last_four, is_active, created_at, last_delivery_at, failure_count",
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    url: row.url,
    events: toEvents(row.events),
    secretLastFour: row.secret_last_four,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastDeliveryAt: row.last_delivery_at,
    failureCount: row.failure_count,
  }));
}
