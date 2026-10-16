import { z } from "zod";

/** Responses from the Go API's admin endpoints. */

export const emptyResponse = z.unknown();

export const segmentCountsResponse = z.object({
  data: z.object({ total: z.number(), new: z.number(), paid: z.number(), active: z.number() }),
});

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  balance: z.number(),
  suspended: z.boolean(),
});
export const adminUsersResponse = z.object({ data: z.array(userSchema) });

export const adminUserDetailResponse = z.object({
  data: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    phone: z.string(),
    businessName: z.string(),
    industry: z.string(),
    role: z.string(),
    accountStatus: z.enum(["active", "suspended", "deleted"]),
    createdAt: z.string(),
    plan: z.enum(["Free", "Pro"]),
    subscriptionStatus: z.string(),
    currentPeriodEnd: z.string().nullish(),
    creditBalance: z.number(),
    fiveHourPoints: z.number(),
    weeklyPoints: z.number(),
  }),
});

const ledgerRow = z.object({
  kind: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  reason: z.string(),
  createdAt: z.string(),
});
export const userLedgerResponse = z.object({
  data: z.object({ balance: z.number(), history: z.array(ledgerRow) }),
});

const priceRow = z.object({
  action: z.string(),
  provider: z.string(),
  unit: z.string(),
  costUsd: z.number(),
  margin: z.number(),
  credits: z.number(),
  enabled: z.boolean(),
});
export type PriceRow = z.infer<typeof priceRow>;
export const pricesResponse = z.object({ data: z.array(priceRow) });

const settingRow = z.object({ key: z.string(), value: z.number() });
export type SettingRow = z.infer<typeof settingRow>;
export const settingsResponse = z.object({ data: z.array(settingRow) });

export const usageResponse = z.object({
  data: z.object({
    actions: z.array(
      z.object({
        action: z.string(),
        count: z.number(),
        credits: z.number(),
        revenueUsd: z.number(),
        estimatedCostUsd: z.number(),
      }),
    ),
    providers: z.array(z.object({ provider: z.string(), unit: z.string(), spent: z.number() })),
  }),
});

const credential = z.object({
  name: z.string(),
  source: z.enum(["vault", "environment", "missing"]),
  last4: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CredentialStatus = z.infer<typeof credential>;
export const providersResponse = z.object({
  data: z.object({ writable: z.boolean(), credentials: z.array(credential) }),
});

const modelOption = z.object({
  id: z.string(),
  name: z.string(),
  context_length: z.number(),
  input_per_million: z.number(),
  output_per_million: z.number(),
});
export type ModelOption = z.infer<typeof modelOption>;
export const modelsResponse = z.object({
  data: z.object({
    roles: z.array(z.object({ key: z.string(), label: z.string(), model: z.string() })),
    openrouter_configured: z.boolean(),
    catalog: z.array(modelOption),
  }),
});

export const billingOverviewResponse = z.object({
  data: z.object({
    active_subscribers: z.number(),
    past_due_subscribers: z.number(),
    canceled_subscribers: z.number(),
    incomplete_subscribers: z.number(),
    monthly_recurring_cents: z.number(),
    subscription_revenue_cents: z.number(),
    pack_revenue_cents: z.number(),
    packs_sold: z.number(),
    credits_spent: z.number(),
    usage_points: z.number(),
    subscribers: z.array(z.object({ email: z.string(), status: z.string(), period_end: z.string().nullish(), updated_at: z.string() })),
    activity: z.array(z.object({
      id: z.number(),
      email: z.string(),
      event_type: z.string(),
      status: z.string(),
      period_end: z.string().nullish(),
      amount_cents: z.number(),
      currency: z.string(),
      attempt_count: z.number(),
      occurred_at: z.string(),
    })),
  }),
});
export type BillingActivity = z.infer<typeof billingOverviewResponse>["data"]["activity"][number];

export const revenueHistoryResponse = z.object({
  data: z.array(z.object({
    date: z.string(),
    currency: z.string(),
    subscriptionCents: z.number(),
    packCents: z.number(),
    refundCents: z.number(),
  })),
});

export const emailFromResponse = z.object({ data: z.object({ from: z.string(), default: z.string() }) });

const setupCheck = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  done: z.boolean(),
  required: z.boolean(),
  hint: z.string().optional(),
});
export type SetupCheck = z.infer<typeof setupCheck>;
export const setupResponse = z.object({
  data: z.object({ checks: z.array(setupCheck), ready: z.boolean(), remaining: z.number() }),
});

const alertRow = z.object({
  id: z.string(),
  kind: z.string(),
  provider: z.string(),
  message: z.string(),
  count: z.number(),
  last_seen: z.string(),
});
export const alertsResponse = z.object({ data: z.array(alertRow) });

export const monitoringSnapshotResponse = z.object({
  data: z.object({
    recentFailureDays: z.number(),
    jobs: z.object({
      queued: z.number(), running: z.number(), completed: z.number(), failed: z.number(), ready: z.number(),
      oldestQueuedAt: z.string().nullish(), oldestRunningAt: z.string().nullish(),
    }),
    posts: z.object({
      preparing: z.number(), scheduled: z.number(), publishing: z.number(), published: z.number(), failed: z.number(), cancelled: z.number(),
    }),
    storage: z.object({ mediaObjects: z.number(), mediaBytes: z.number() }),
    recentFailures: z.array(z.object({ source: z.string(), name: z.string(), message: z.string(), at: z.string() })),
  }),
});
