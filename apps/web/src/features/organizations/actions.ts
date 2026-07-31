"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
});

export type OrgResult = { status: "ok" } | { status: "error"; message: string };

/** Slug derived from the name, since the user should not have to think about it. */
function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  // A short suffix keeps two teams with the same name from colliding.
  return `${base || "team"}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Creates an organization with the caller as owner. The database function does
 * both inserts in one transaction, so a failure cannot leave an org with no
 * owner behind.
 */
export async function createOrganization(input: z.input<typeof createSchema>): Promise<OrgResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid name" };
  }
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_organization", {
      p_name: parsed.data.name,
      p_slug: toSlug(parsed.data.name),
    });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/settings/team");
    return { status: "ok" };
  } catch (error) {
    logger.warn("failed to create organization", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not create the team" };
  }
}
