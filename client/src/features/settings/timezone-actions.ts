"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/time/zone";

/**
 * Records the timezone the browser reports.
 *
 * Validated as a real IANA name rather than trusted, because it arrives from the
 * client and ends up in a formatter. `refine` rather than an enum: the list of
 * zones is the runtime's, and it changes when tzdata does.
 */
const schema = z.object({
  timeZone: z.string().min(1).max(64).refine(isValidTimeZone, "Not a recognised IANA timezone"),
});

export async function saveTimeZone(input: z.input<typeof schema>): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ timezone: parsed.data.timeZone } as never)
    .eq("id", user.id);

  if (error) {
    logger.warn("could not save timezone", { error: error.message });
    return { ok: false };
  }
  return { ok: true };
}
