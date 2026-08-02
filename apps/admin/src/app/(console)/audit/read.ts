import "server-only";

import { createClient } from "@/lib/auth/supabase";

import { auditEntrySchema, PAGE_SIZE, type AuditPage, type AuditQuery } from "./query";

/**
 * Reads a page of the audit log with the caller's own session.
 *
 * No SECURITY DEFINER function is involved and none is wanted: 0029 gives
 * admin_audit_log a select policy of `is_admin()` and no insert, update or
 * delete policy at all, so RLS is already the exact rule this page needs. A
 * definer function here would only move that decision into code that could
 * forget to make it.
 */
export async function fetchAuditPage(query: AuditQuery): Promise<AuditPage | null> {
  const supabase = await createClient();
  const from = (query.page - 1) * PAGE_SIZE;

  let request = supabase
    .from("admin_audit_log")
    .select(
      "id, created_at, actor_email, action, target_type, target_id, summary, before, after, ip",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // Substring rather than equality: an operator filtering by "sign_in" wants
  // sign_in_failed and sign_in_denied too, and knows part of an email more
  // often than all of it. The value is escaped so a % cannot widen the match.
  if (query.actor) request = request.ilike("actor_email", `%${escapeLike(query.actor)}%`);
  if (query.action) request = request.ilike("action", `%${escapeLike(query.action)}%`);

  const { data, error, count } = await request;
  if (error) return null;

  const parsed = auditEntrySchema.array().safeParse(
    data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actorEmail: row.actor_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id ?? null,
      summary: row.summary ?? null,
      before: row.before ?? null,
      after: row.after ?? null,
      ip: row.ip ?? null,
    })),
  );

  if (!parsed.success) return null;

  return { entries: parsed.data, total: count ?? parsed.data.length };
}

/** PostgREST passes these through to LIKE, where they are wildcards. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
