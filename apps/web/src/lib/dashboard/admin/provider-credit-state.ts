export interface ProviderCreditExpiry {
  readonly daysUntilExpiry: number | null;
  readonly needsAttention: boolean;
}

export function providerCreditExpiry(
  expiresAt: string | null,
  warningDays: number,
  now = Date.now(),
): ProviderCreditExpiry {
  if (!expiresAt) return { daysUntilExpiry: null, needsAttention: false };
  const daysUntilExpiry = Math.ceil((Date.parse(expiresAt) - now) / 86_400_000);
  return { daysUntilExpiry, needsAttention: daysUntilExpiry <= warningDays };
}
