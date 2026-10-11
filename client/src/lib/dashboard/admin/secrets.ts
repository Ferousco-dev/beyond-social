import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ManagedSecretLocation = "vercel" | "supabase" | "host";

export interface ManagedSecret {
  key: string;
  description: string;
  expectedBy: string;
  location: ManagedSecretLocation;
  lastFour: string | null;
  isSet: boolean;
  hasStoredValue: boolean;
  rotatedAt: string | null;
  rotatedByEmail: string | null;
}

const secretRowSchema = z.object({
  key: z.string(),
  description: z.string(),
  expected_by: z.string(),
  location: z.enum(["vercel", "supabase", "host"]),
  last_four: z.string().nullable(),
  is_set: z.boolean(),
  has_stored_value: z.boolean(),
  rotated_at: z.string().nullable(),
  rotated_by_email: z.string().nullable(),
});

/**
 * Secret metadata only, unset entries first. Never returns a value: the
 * database function this wraps has no value column to return.
 */
export async function getManagedSecrets(): Promise<ManagedSecret[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_secrets_list");
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = secretRowSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        key: parsed.data.key,
        description: parsed.data.description,
        expectedBy: parsed.data.expected_by,
        location: parsed.data.location,
        lastFour: parsed.data.last_four,
        isSet: parsed.data.is_set,
        hasStoredValue: parsed.data.has_stored_value,
        rotatedAt: parsed.data.rotated_at,
        rotatedByEmail: parsed.data.rotated_by_email,
      },
    ];
  });
}
