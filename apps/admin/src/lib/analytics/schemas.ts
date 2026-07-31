import { z } from "zod";

/**
 * Row shapes for the `admin_*` analytics functions in migration 0030.
 *
 * PostgREST returns `bigint` and `numeric` as JSON strings once they exceed
 * what a double can hold, and as numbers otherwise, so every count and amount
 * is coerced rather than assumed. Parsing here is the boundary: a page never
 * sees an unvalidated row.
 */

const count = z.coerce.number().int().nonnegative();
const amount = z.coerce.number().nonnegative();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date");

export const signupsDaySchema = z.object({ day, signups: count });

export const activeUsersDaySchema = z.object({ day, dau: count, mau: count });

export const userTotalsSchema = z.object({
  total_users: count,
  active_subscriptions: count,
});

export const planSubscriptionsSchema = z.object({
  plan: z.string().min(1),
  subscriptions: count,
  trialing: count,
});

export const generationsDaySchema = z.object({
  day,
  total: count,
  succeeded: count,
  failed: count,
  pending: count,
});

export const aiSpendDaySchema = z.object({
  day,
  cost_usd: amount,
  calls: count,
  failed_calls: count,
  cached_calls: count,
});

export const aiSpendByModelSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  calls: count,
  cost_usd: amount,
  input_tokens: count,
  output_tokens: count,
  failed_calls: count,
});

export type SignupsDay = z.infer<typeof signupsDaySchema>;
export type ActiveUsersDay = z.infer<typeof activeUsersDaySchema>;
export type UserTotals = z.infer<typeof userTotalsSchema>;
export type PlanSubscriptions = z.infer<typeof planSubscriptionsSchema>;
export type GenerationsDay = z.infer<typeof generationsDaySchema>;
export type AiSpendDay = z.infer<typeof aiSpendDaySchema>;
export type AiSpendByModel = z.infer<typeof aiSpendByModelSchema>;

/**
 * Window length in days, matching the clamp inside `admin_window_days` so a bad
 * value is rejected here rather than silently widened by Postgres.
 */
export const windowDaysSchema = z.number().int().min(1).max(365);
export type WindowDays = z.infer<typeof windowDaysSchema>;
