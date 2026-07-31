export { createAnalyticsClient } from "./client";

export {
  fetchActiveUsersDaily,
  fetchAiSpendByModel,
  fetchAiSpendDaily,
  fetchGenerationsDaily,
  fetchSignupsDaily,
  fetchSubscriptionsByPlan,
  fetchUserTotals,
} from "./queries";

export { AnalyticsError, isForbidden, type AnalyticsClient } from "./rpc";

export type {
  ActiveUsersDay,
  AiSpendByModel,
  AiSpendDay,
  GenerationsDay,
  PlanSubscriptions,
  SignupsDay,
  UserTotals,
  WindowDays,
} from "./schemas";
