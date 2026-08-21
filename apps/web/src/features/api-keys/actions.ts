"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateApiKey } from "@/lib/api/keys";
import { callerHasIntegrations, INTEGRATIONS_DENIAL } from "@/lib/billing/integration-gate";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({ name: z.string().trim().min(1).max(60) });

export type CreateKeyResult =
  { status: "ok"; plaintext: string } | { status: "error"; message: string };

/**
 * Creates an API key and returns the plaintext exactly once. It is never stored
 * and cannot be recovered, so the UI has to make the user copy it now.
 */
export async function createApiKey(input: z.input<typeof createSchema>): Promise<CreateKeyResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Give the key a name" };
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };
  // The panel is hidden below the plan, but a server action is a public
  // endpoint: this is the check that actually decides.
  if (!(await callerHasIntegrations())) return { status: "error", message: INTEGRATIONS_DENIAL };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Sign in to create a key" };

    const key = generateApiKey();
    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: parsed.data.name,
      key_hash: key.hash,
      key_prefix: key.prefix,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/settings/api-keys");
    return { status: "ok", plaintext: key.plaintext };
  } catch (error) {
    logger.warn("failed to create api key", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not create the key" };
  }
}

/** Revokes a key. Revocation is a timestamp, so the audit trail survives. */
export async function revokeApiKey(id: string): Promise<{ status: "ok" | "error" }> {
  if (!isSupabaseConfigured) return { status: "error" };
  try {
    const supabase = await createClient();
    // Selected back the same way createApiKey's own insert is checked: RLS
    // turns a foreign or already-revoked id into a match against nothing
    // rather than an error, and without this that read as success.
    const { data, error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { status: "error" };
    revalidatePath("/dashboard/settings/api-keys");
    return { status: "ok" };
  } catch (error) {
    logger.warn("failed to revoke api key", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error" };
  }
}
