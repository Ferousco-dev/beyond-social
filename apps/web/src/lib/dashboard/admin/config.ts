import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AppConfigValueType = "string" | "number" | "boolean" | "json";
export type AppConfigTakesEffect = "immediate" | "redeploy";

export interface AppConfigRow {
  key: string;
  area: string;
  value: unknown;
  valueType: AppConfigValueType;
  description: string;
  takesEffect: AppConfigTakesEffect;
  updatedAt: string;
  updatedByEmail: string | null;
}

const configRowSchema = z.object({
  key: z.string(),
  area: z.string(),
  value: z.unknown(),
  value_type: z.enum(["string", "number", "boolean", "json"]),
  description: z.string(),
  takes_effect: z.enum(["immediate", "redeploy"]),
  updated_at: z.string(),
  updated_by_email: z.string().nullable(),
});

/** Every app_config row, grouped by area for display. Empty on error. */
export async function getAppConfig(): Promise<AppConfigRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_app_config_all");
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = configRowSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        key: parsed.data.key,
        area: parsed.data.area,
        value: parsed.data.value,
        valueType: parsed.data.value_type,
        description: parsed.data.description,
        takesEffect: parsed.data.takes_effect,
        updatedAt: parsed.data.updated_at,
        updatedByEmail: parsed.data.updated_by_email,
      },
    ];
  });
}
