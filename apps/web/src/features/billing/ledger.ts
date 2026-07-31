import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Transaction history, read straight from `credit_ledger`, which is the source
 * of truth for a balance. RLS scopes it to the caller, so there is no user id to
 * pass and no way to read someone else's.
 */

const KINDS = ["grant", "debit", "refund", "adjustment"] as const;
export type LedgerKind = (typeof KINDS)[number];

const ledgerRowSchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  kind: z.enum(KINDS),
  external_ref: z.string().nullable(),
  created_at: z.string(),
});

export interface LedgerEntry {
  readonly id: string;
  /** Signed: negative is spend, positive is a grant or refund. */
  readonly delta: number;
  readonly kind: LedgerKind;
  readonly description: string;
  /** The idempotency key behind the row, shown so support can trace a charge. */
  readonly reference: string | null;
  readonly createdAt: string;
}

/** Prefixed reasons carry their subject after the colon, e.g. `subscription:studio`. */
function describe(reason: string, kind: LedgerKind): string {
  const [head, tail] = reason.split(":", 2);
  switch (head) {
    case "signup":
      return "Welcome credits";
    case "subscription":
      return tail
        ? `${tail.charAt(0).toUpperCase()}${tail.slice(1)} plan allowance`
        : "Plan allowance";
    case "purchase":
      return "Credit pack";
    case "video_generation":
      return "Video generation";
    case "video_generation_refund":
      return "Refund, generation failed";
    case "ledger_reconciliation":
      return "Opening balance";
    default:
      return kind === "debit" ? "Usage" : "Adjustment";
  }
}

export async function getCreditHistory(limit = 50): Promise<readonly LedgerEntry[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, delta, reason, kind, external_ref, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error !== null || data === null) return [];

  const parsed = ledgerRowSchema.array().safeParse(data);
  if (!parsed.success) return [];

  return parsed.data.map((row) => ({
    id: row.id,
    delta: row.delta,
    kind: row.kind,
    description: describe(row.reason, row.kind),
    reference: row.external_ref,
    createdAt: row.created_at,
  }));
}
