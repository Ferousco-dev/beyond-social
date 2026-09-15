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

export interface AuditLogFilter {
  action?: string;
  targetType?: string;
  limit?: number;
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
 * Reverse-chronological admin audit log. No dedicated RPC exists: the table is
 * RLS-gated directly, following `getFeatureFlags`'s direct-select pattern.
 */
export async function getAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  let query = supabase
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, summary, before, after, created_at")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);

  if (filter.action) query = query.eq("action", filter.action);
  if (filter.targetType) query = query.eq("target_type", filter.targetType);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = auditRowSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        id: parsed.data.id,
        actorEmail: parsed.data.actor_email,
        action: parsed.data.action,
        targetType: parsed.data.target_type,
        targetId: parsed.data.target_id,
        summary: parsed.data.summary,
        before: parsed.data.before,
        after: parsed.data.after,
        createdAt: parsed.data.created_at,
      },
    ];
  });
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
