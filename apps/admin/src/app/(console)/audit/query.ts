import { z } from "zod";

/**
 * The audit log is the record of what this console did, so its reads are
 * URL addressable: a filtered view can be linked to, bookmarked and reopened.
 * Everything below is parsed from the query string at the boundary.
 */

export const PAGE_SIZE = 50;

export const auditQuerySchema = z.object({
  /** Matched against the actor email recorded on the row. */
  actor: z.string().trim().max(320).catch(""),
  action: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

/** One row of public.admin_audit_log, as the viewer needs it. */
export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  actorEmail: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  summary: z.string().nullable(),
  before: z.unknown(),
  after: z.unknown(),
  ip: z.string().nullable(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

export interface AuditPage {
  readonly entries: readonly AuditEntry[];
  /** Matching rows in the whole log, not on this page. */
  readonly total: number;
}

export function auditHref(query: AuditQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.actor) params.set("actor", query.actor);
  if (query.action) params.set("action", query.action);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/audit?${search}` : "/audit";
}
