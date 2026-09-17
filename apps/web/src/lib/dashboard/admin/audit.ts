import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditLogCursor {
  createdAt: string;
  id: string;
}

export interface AuditLogFilter {
  action?: string;
  targetType?: string;
  limit?: number;
  cursor?: AuditLogCursor | null;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: AuditLogCursor | null;
}

const auditRowSchema = z.object({
  id: z.string(),
  actor_email: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable(),
  summary: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  created_at: z.string(),
});

/**
 * Reverse-chronological admin audit log, keyset-paginated on (created_at, id)
 * so an admin can page back through the full history instead of only ever
 * seeing the newest page. No dedicated RPC exists: the table is RLS-gated
 * directly, following `getFeatureFlags`'s direct-select pattern.
 */
export async function getAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogPage> {
  if (!isSupabaseConfigured) return { entries: [], nextCursor: null };
  const supabase = await createClient();
  const limit = filter.limit ?? 100;

  let query = supabase
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, summary, before, after, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (filter.action) query = query.eq("action", filter.action);
  if (filter.targetType) query = query.eq("target_type", filter.targetType);
  if (filter.cursor) {
    const { createdAt, id } = filter.cursor;
    query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
  }

  const { data, error } = await query;
  if (error || !data) return { entries: [], nextCursor: null };

  const entries: AuditLogEntry[] = [];
  for (const row of data) {
    const parsed = auditRowSchema.safeParse(row);
    if (!parsed.success) continue;
    entries.push({
      id: parsed.data.id,
      actorEmail: parsed.data.actor_email,
      action: parsed.data.action,
      targetType: parsed.data.target_type,
      targetId: parsed.data.target_id,
      summary: parsed.data.summary,
      before: parsed.data.before,
      after: parsed.data.after,
      createdAt: parsed.data.created_at,
    });
  }

  const last = entries.at(-1);
  const nextCursor =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { entries, nextCursor };
}

/** Distinct action names seen in the log, for the filter control. */
export async function getAuditActions(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("action")
    .order("action")
    .limit(1000);
  if (error || !data) return [];
  return Array.from(new Set(data.map((row: { action: string }) => row.action))).sort();
}
