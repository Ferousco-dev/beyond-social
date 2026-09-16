import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const userRowSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  plan: z.string().nullable(),
  role: z.string().nullable(),
  credits_used: z.coerce.number(),
  credits_total: z.coerce.number(),
  suspended_at: z.string().nullable(),
  created_at: z.string(),
});

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  plan: string | null;
  role: string | null;
  creditsUsed: number;
  creditsTotal: number;
  suspendedAt: string | null;
  createdAt: string;
}

export interface UserSearchCursor {
  createdAt: string;
  id: string;
}

export interface UserSearchResult {
  users: AdminUserRow[];
  nextCursor: UserSearchCursor | null;
}

function toUserRow(row: z.infer<typeof userRowSchema>): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    plan: row.plan,
    role: row.role,
    creditsUsed: row.credits_used,
    creditsTotal: row.credits_total,
    suspendedAt: row.suspended_at,
    createdAt: row.created_at,
  };
}

/** Keyset-paginated account search. Returns an empty page when unavailable. */
export async function searchUsers(
  query: string,
  cursor: UserSearchCursor | null,
  limit = 25,
): Promise<UserSearchResult> {
  if (!isSupabaseConfigured) return { users: [], nextCursor: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_search_users", {
    p_query: query,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_limit: limit,
  });
  if (error || !data) return { users: [], nextCursor: null };

  const users: AdminUserRow[] = [];
  for (const row of data) {
    const parsed = userRowSchema.safeParse(row);
    if (parsed.success) users.push(toUserRow(parsed.data));
  }

  const last = users.at(-1);
  const nextCursor =
    users.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { users, nextCursor };
}

const userDetailSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  plan: z.string().nullable(),
  role: z.string().nullable(),
  credits_used: z.coerce.number(),
  credits_total: z.coerce.number(),
  credits_period_start: z.string().nullable(),
  project_count: z.coerce.number(),
  generation_count: z.coerce.number(),
  message_count: z.coerce.number(),
  created_at: z.string(),
  last_active_at: z.string().nullable(),
  suspended_at: z.string().nullable(),
  suspended_reason: z.string().nullable(),
  suspended_by_email: z.string().nullable(),
  subscription_status: z.string().nullable(),
  subscription_plan: z.string().nullable(),
  subscription_period_end: z.string().nullable(),
  subscription_cancel_at_period_end: z.boolean().nullable(),
});

export interface AdminUserDetail {
  id: string;
  email: string | null;
  fullName: string | null;
  plan: string | null;
  role: string | null;
  creditsUsed: number;
  creditsTotal: number;
  creditsPeriodStart: string | null;
  projectCount: number;
  generationCount: number;
  messageCount: number;
  createdAt: string;
  lastActiveAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedByEmail: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean | null;
}

function toDetail(row: z.infer<typeof userDetailSchema>): AdminUserDetail {
  return {
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
  };
}

/** One account's full detail. Returns null when not found or not an admin. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_detail", { p_user: userId });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = userDetailSchema.safeParse(row);
  return parsed.success ? toDetail(parsed.data) : null;
}
