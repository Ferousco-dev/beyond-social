"use server";

import { getAuditLog, type AuditLogCursor, type AuditLogPage } from "@/lib/dashboard/admin";

/**
 * Read-only wrapper so the "Load more" button, a client component, can reach
 * the admin-gated audit log. The gate is still enforced in the database.
 */
export async function loadAuditLogAction(
  action: string | undefined,
  cursor: AuditLogCursor | null,
): Promise<AuditLogPage> {
  return getAuditLog({ action, limit: 100, cursor });
}
