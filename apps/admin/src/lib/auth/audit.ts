import { type AdminAuditInsert, type Json } from "./database";
import { createAuditWriter, type AuthClient } from "./supabase";

/**
 * Audit actions this module emits. Every value matches the database's
 * `^[a-z0-9_.]{2,60}$` check, so a typo fails typecheck rather than the insert.
 */
export const AUTH_AUDIT_ACTIONS = {
  signIn: "admin.sign_in",
  signInFailed: "admin.sign_in_failed",
  signInDenied: "admin.sign_in_denied",
  signInThrottled: "admin.sign_in_throttled",
  signOut: "admin.sign_out",
  accessDenied: "admin.access_denied",
} as const;

export type AuthAuditAction = (typeof AUTH_AUDIT_ACTIONS)[keyof typeof AUTH_AUDIT_ACTIONS];

type AuditEntry = {
  action: AuthAuditAction;
  targetType: string;
  targetId?: string | null;
  summary?: string;
  before?: Json | null;
  after?: Json | null;
  ip: string | null;
};

/**
 * Records an action performed by the signed-in admin, through the admin-gated
 * database function. Errors propagate: a privileged action whose audit row did
 * not land must not be treated as having succeeded.
 */
export async function recordAdminAction(client: AuthClient, entry: AuditEntry): Promise<void> {
  const { error } = await client.rpc("admin_log_action", {
    p_action: entry.action,
    p_target_type: entry.targetType,
    p_target_id: entry.targetId ?? null,
    p_summary: entry.summary ?? "",
    p_before: entry.before ?? null,
    p_after: entry.after ?? null,
    p_ip: entry.ip,
  });

  if (error) {
    throw new Error(`Audit write failed for ${entry.action}: ${error.message}`);
  }
}

type RefusalEntry = AuditEntry & { actorId: string | null; actorEmail: string };

/**
 * Records an attempt that was refused.
 *
 * `admin_log_action` cannot be used here: it gates on `is_admin()`, and the
 * whole point of these rows is that the caller was not an admin. The write
 * therefore goes through the service role, which is allowed because the insert
 * shape is fixed here and the table itself is append-only in the database.
 *
 * Never throws. The caller is already refusing the request, and a logging
 * failure must not turn a denial into a different outcome.
 */
export async function recordRefusal(entry: RefusalEntry): Promise<void> {
  const row: AdminAuditInsert = {
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    summary: entry.summary ?? "",
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip,
  };

  try {
    const { error } = await createAuditWriter().from("admin_audit_log").insert(row);
    if (error) {
      console.error(`Audit write failed for ${entry.action}: ${error.message}`);
    }
  } catch (cause) {
    console.error(`Audit write failed for ${entry.action}`, cause);
  }
}
