import "server-only";

import { createUsersClient } from "./database";
import {
  userDetailSchema,
  userRowSchema,
  type Cursor,
  type UserDetail,
  type UserRow,
} from "./schema";

/**
 * Every call this feature makes to the database.
 *
 * All five are SECURITY DEFINER functions that check `is_admin()` before they
 * read or write anything, so a caller who is somehow not an admin gets an error
 * rather than a row. Nothing here touches a table directly.
 *
 * Reads return null on failure rather than throwing. A user lookup that
 * white-screens during a support call is worse than one that says it could not
 * read; writes return a message instead, because an operator who pressed a
 * button needs to know whether it took effect.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function searchUsers(
  query: string,
  cursor: Cursor | null,
  limit: number,
): Promise<readonly UserRow[] | null> {
  const supabase = await createUsersClient();
  const { data, error } = await supabase.rpc("admin_search_users", {
    p_query: query,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });

  if (error) return null;

  const parsed = userRowSchema.array().safeParse(
    (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      plan: row.plan,
      role: row.role,
      creditsUsed: row.credits_used,
      creditsTotal: row.credits_total,
      suspendedAt: row.suspended_at,
      createdAt: row.created_at,
    })),
  );

  if (!parsed.success) {
    console.error("admin_search_users returned an unexpected shape", parsed.error.message);
    return null;
  }
  return parsed.data;
}

export async function readUserDetail(userId: string): Promise<UserDetail | null> {
  const supabase = await createUsersClient();
  const { data, error } = await supabase.rpc("admin_user_detail", { p_user: userId });
  if (error) return null;

  const row = (data ?? [])[0];
  if (!row) return null;

  const parsed = userDetailSchema.safeParse({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    plan: row.plan,
    role: row.role,
    creditsUsed: row.credits_used,
    creditsTotal: row.credits_total,
    creditsPeriodStart: row.credits_period_start,
    projectCount: row.project_count,
    generationCount: row.generation_count,
    messageCount: row.message_count,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
    suspendedAt: row.suspended_at,
    suspendedReason: row.suspended_reason,
    suspendedByEmail: row.suspended_by_email,
    subscriptionStatus: row.subscription_status,
    subscriptionPlan: row.subscription_plan,
    subscriptionPeriodEnd: row.subscription_period_end,
    subscriptionCancelAtPeriodEnd: row.subscription_cancel_at_period_end,
  });

  if (!parsed.success) {
    console.error("admin_user_detail returned an unexpected shape", parsed.error.message);
    return null;
  }
  return parsed.data;
}

export async function setUserCredits(
  userId: string,
  total: number,
  used: number,
  reason: string,
  ip: string | null,
): Promise<ActionResult> {
  const supabase = await createUsersClient();
  const { error } = await supabase.rpc("admin_set_user_credits", {
    p_user: userId,
    p_total: total,
    p_used: used,
    p_reason: reason,
    p_ip: ip,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function setUserPlan(
  userId: string,
  plan: string,
  total: number,
  reason: string,
  ip: string | null,
): Promise<ActionResult> {
  const supabase = await createUsersClient();
  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_user: userId,
    p_plan: plan,
    p_total: total,
    p_reason: reason,
    p_ip: ip,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function setUserSuspension(
  userId: string,
  suspended: boolean,
  reason: string,
  ip: string | null,
): Promise<ActionResult> {
  const supabase = await createUsersClient();
  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user: userId,
    p_suspended: suspended,
    p_reason: reason,
    p_ip: ip,
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}
