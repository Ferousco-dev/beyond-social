import {
  activeUsersDaySchema,
  aiSpendByModelSchema,
  aiSpendDaySchema,
  generationsDaySchema,
  planSubscriptionsSchema,
  signupsDaySchema,
  userTotalsSchema,
  windowDaysSchema,
  type ActiveUsersDay,
  type AiSpendByModel,
  type AiSpendDay,
  type GenerationsDay,
  type PlanSubscriptions,
  type SignupsDay,
  type UserTotals,
} from "./schemas";
import { selectRow, selectRows, type AnalyticsClient } from "./rpc";

/**
 * Reads over the admin analytics functions (migration 0030). Each one is
 * SECURITY DEFINER and gated on `is_admin()` in the database, so these are safe
 * to call with the caller's own session: a non-admin gets an error, never rows.
 *
 * Every series is inclusive of today and continuous, so a chart can render the
 * rows in order without filling gaps.
 */

const DEFAULT_WINDOW_DAYS = 30;

function windowArgs(days: number): { p_days: number } {
  return { p_days: windowDaysSchema.parse(days) };
}

/** New signups per day. */
export function fetchSignupsDaily(
  client: AnalyticsClient,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<SignupsDay[]> {
  return selectRows(client, "admin_signups_daily", signupsDaySchema, windowArgs(days));
}

/**
 * Daily and 30-day-trailing monthly actives. "Active" means the user sent a
 * message or started a generation that day: the product records no sessions or
 * page views, so a visit that did neither is not counted.
 */
export function fetchActiveUsersDaily(
  client: AnalyticsClient,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<ActiveUsersDay[]> {
  return selectRows(client, "admin_active_users_daily", activeUsersDaySchema, windowArgs(days));
}

/** Lifetime user count and the number of live subscriptions right now. */
export function fetchUserTotals(client: AnalyticsClient): Promise<UserTotals> {
  return selectRow(client, "admin_user_totals", userTotalsSchema);
}

/** Live subscriptions grouped by plan, largest first. */
export function fetchSubscriptionsByPlan(client: AnalyticsClient): Promise<PlanSubscriptions[]> {
  return selectRows(client, "admin_subscriptions_by_plan", planSubscriptionsSchema);
}

/** Generations per day, split by outcome. `pending` has not settled yet. */
export function fetchGenerationsDaily(
  client: AnalyticsClient,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<GenerationsDay[]> {
  return selectRows(client, "admin_generations_daily", generationsDaySchema, windowArgs(days));
}

/** AI spend and call volume per day. Cached calls are free. */
export function fetchAiSpendDaily(
  client: AnalyticsClient,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<AiSpendDay[]> {
  return selectRows(client, "admin_ai_spend_daily", aiSpendDaySchema, windowArgs(days));
}

/** AI spend by model over the window, most expensive first. */
export function fetchAiSpendByModel(
  client: AnalyticsClient,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<AiSpendByModel[]> {
  return selectRows(client, "admin_ai_spend_by_model", aiSpendByModelSchema, windowArgs(days));
}
