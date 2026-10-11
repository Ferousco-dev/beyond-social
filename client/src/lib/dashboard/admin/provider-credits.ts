import "server-only";

import { z } from "zod";

import { getAppConfig } from "./config";
import { providerCreditExpiry } from "./provider-credit-state";

const providerCreditValueSchema = z.object({
  remainingCredits: z.number().nonnegative().nullable(),
  expiresAt: z.string().datetime().nullable(),
  warningDays: z.number().int().min(1).max(365),
});

export interface ProviderCreditAccount {
  readonly key: string;
  readonly provider: string;
  readonly remainingCredits: number | null;
  readonly expiresAt: string | null;
  readonly warningDays: number;
  readonly daysUntilExpiry: number | null;
  readonly needsAttention: boolean;
}

export async function getProviderCreditAccounts(): Promise<ProviderCreditAccount[]> {
  const rows = await getAppConfig();
  return rows.flatMap((row) => {
    if (row.area !== "provider_credits") return [];
    const value = providerCreditValueSchema.safeParse(row.value);
    if (!value.success) return [];
    const expiry = providerCreditExpiry(value.data.expiresAt, value.data.warningDays);
    return [
      {
        key: row.key,
        provider: row.key.replace("provider_credits.", ""),
        remainingCredits: value.data.remainingCredits,
        expiresAt: value.data.expiresAt,
        warningDays: value.data.warningDays,
        daysUntilExpiry: expiry.daysUntilExpiry,
        needsAttention: expiry.needsAttention,
      },
    ];
  });
}
