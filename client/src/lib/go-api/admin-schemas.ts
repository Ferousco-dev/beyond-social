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
});
export type AdminUser = z.infer<typeof userSchema>;
export const adminUsersResponse = z.object({ data: z.array(userSchema) });

const ledgerRow = z.object({
  kind: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  reason: z.string(),
  createdAt: z.string(),
});
export type LedgerRow = z.infer<typeof ledgerRow>;
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
export type AlertRow = z.infer<typeof alertRow>;
export const alertsResponse = z.object({ data: z.array(alertRow) });
