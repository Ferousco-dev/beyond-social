"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const setConfigSchema = z.object({
  key: z.string().min(1),
  // The RPC itself validates the value against the row's declared value_type,
  // so the shape check here only keeps obviously malformed input from a request.
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.unknown()),
    z.array(z.unknown()),
  ]),
});

/** Sets one app_config value. The database validates it against value_type and audits the change. */
export async function setAppConfig(input: z.input<typeof setConfigSchema>): Promise<ActionResult> {
  const parsed = setConfigSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_app_config", {
    p_key: parsed.data.key,
    // The RPC's jsonb parameter accepts any JSON value; the generated Json type
    // only distinguishes arrays whose element type it already knows.
    p_value: parsed.data.value as never,
  });

  if (!error) revalidatePath("/dashboard/admin/config");
  return toActionResult(error);
}
