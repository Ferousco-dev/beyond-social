import "server-only";

import { headers } from "next/headers";

import { type Json } from "@/lib/auth/database";
import { clientIp } from "@/lib/auth/request";
import { createClient } from "@/lib/auth/supabase";

/**
 * Audit actions this feature emits. Each value matches the database's
 * `^[a-z0-9_.]{2,60}$` check, so a typo fails typecheck rather than the insert.
 *
 * The `_failed` variants exist because the audit row is written before the
 * queue is touched: see `recordQueueAction`. Without them, a refused or
 * impossible action would leave a row claiming it happened.
 */
export const QUEUE_AUDIT_ACTIONS = {
  retry: "queue.job_retried",
  retryFailed: "queue.job_retry_failed",
  remove: "queue.job_removed",
  removeFailed: "queue.job_remove_failed",
} as const;

export type QueueAuditAction = (typeof QUEUE_AUDIT_ACTIONS)[keyof typeof QUEUE_AUDIT_ACTIONS];

export const QUEUE_TARGET_TYPE = "queue_job";

interface QueueAuditEntry {
  action: QueueAuditAction;
  jobId: string;
  summary: string;
  before?: Json;
}

/**
 * Records one queue action through the admin-gated database function.
 *
 * Throws when the row does not land, and callers must let that propagate: an
 * action that could not be audited must not be performed. That ordering is why
 * the intent is recorded first and a `_failed` row follows if the queue then
 * refuses. The alternative, acting first and logging after, has a window where
 * a job is retried and nothing anywhere says who did it.
 */
export async function recordQueueAction(entry: QueueAuditEntry): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_log_action", {
    p_action: entry.action,
    p_target_type: QUEUE_TARGET_TYPE,
    p_target_id: entry.jobId,
    p_summary: entry.summary,
    p_before: entry.before ?? null,
    p_after: null,
    p_ip: clientIp(await headers()),
  });

  if (error) {
    throw new Error(`Audit write failed for ${entry.action}: ${error.message}`);
  }
}
