import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface DailyPoint {
  day: string;
  value: number;
}

/** Signups per day over the window. */
export async function getSignupsDaily(days = 30): Promise<DailyPoint[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_signups_daily", { p_days: days });
  if (error || !data) return [];

  const schema = z.object({ day: z.string(), signups: z.coerce.number() });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [{ day: parsed.data.day, value: parsed.data.signups }] : [];
  });
}

export interface ActiveUsersPoint {
  day: string;
  dau: number;
  mau: number;
}

/** Daily and monthly actives over the window. */
export async function getActiveUsersDaily(days = 30): Promise<ActiveUsersPoint[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_active_users_daily", { p_days: days });
  if (error || !data) return [];

  const schema = z.object({ day: z.string(), dau: z.coerce.number(), mau: z.coerce.number() });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export interface UserTotals {
  totalUsers: number;
  activeSubscriptions: number;
}

/** Headline totals: everyone who signed up, and who is paying now. */
export async function getUserTotals(): Promise<UserTotals | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_totals");
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({ total_users: z.coerce.number(), active_subscriptions: z.coerce.number() })
    .safeParse(row);
  if (!parsed.success) return null;
  return {
    totalUsers: parsed.data.total_users,
    activeSubscriptions: parsed.data.active_subscriptions,
  };
}

export interface PlanBreakdown {
  plan: string;
  subscriptions: number;
  trialing: number;
}

/** Active subscriptions grouped by plan, most popular first. */
export async function getSubscriptionsByPlan(): Promise<PlanBreakdown[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_subscriptions_by_plan");
  if (error || !data) return [];

  const schema = z.object({
    plan: z.string(),
    subscriptions: z.coerce.number(),
    trialing: z.coerce.number(),
  });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export interface GenerationsPoint {
  day: string;
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
}

/** Video generations per day over the window. */
export async function getGenerationsDaily(days = 30): Promise<GenerationsPoint[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_generations_daily", { p_days: days });
  if (error || !data) return [];

  const schema = z.object({
    day: z.string(),
    total: z.coerce.number(),
    succeeded: z.coerce.number(),
    failed: z.coerce.number(),
    pending: z.coerce.number(),
  });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}
