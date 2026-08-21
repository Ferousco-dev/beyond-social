"use server";

import { revalidatePath } from "next/cache";

import { callerHasIntegrations, INTEGRATIONS_DENIAL } from "@/lib/billing/integration-gate";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { generateWebhookSecret, isWebhookSigningConfigured } from "@/lib/webhooks/secret";
import { createWebhookSchema, type CreateWebhookInput } from "@/lib/webhooks/types";
import { checkWebhookUrl, WEBHOOK_URL_MESSAGES } from "@/lib/webhooks/url";

const PATH = "/dashboard/settings/webhooks";

export type SecretResult =
  { status: "ok"; secret: string; lastFour: string } | { status: "error"; message: string };

export type ActionResult = { status: "ok" } | { status: "error"; message: string };

/** Turns a Postgres failure into something the form can say out loud. */
function describeDbError(message: string): string {
  if (message.includes("webhook limit reached")) {
    return "You have reached the limit of 10 endpoints. Delete one first.";
  }
  if (message.includes("user_webhooks_user_url_idx")) {
    return "That URL is already registered. Every event would be delivered to it twice.";
  }
  return "Could not save the endpoint.";
}

/**
 * Registers an endpoint and returns the signing secret exactly once.
 *
 * The secret is generated here, hashed, and the plaintext travels back in this
 * one result and nowhere else. It is never logged, never stored, and there is
 * no action that can return it again.
 */
export async function createWebhook(input: CreateWebhookInput): Promise<SecretResult> {
  const parsed = createWebhookSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Pick a URL and at least one event." };
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };
  // The panel is hidden below the plan, but a server action is a public
  // endpoint: this is the check that actually decides.
  if (!(await callerHasIntegrations())) return { status: "error", message: INTEGRATIONS_DENIAL };
  // Without the key there is nothing to sign a delivery with, so an endpoint
  // registered now would be stored and never used. Refused up front rather than
  // accepted and quietly inert.
  if (!isWebhookSigningConfigured) {
    return { status: "error", message: "Webhook signing is not configured yet." };
  }

  // Re-checked on the server because the client check is a convenience. This is
  // the one that decides, and it is the SSRF guard.
  const checked = checkWebhookUrl(parsed.data.url);
  if (!checked.ok) return { status: "error", message: WEBHOOK_URL_MESSAGES[checked.reason] };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Sign in to add an endpoint" };

    const secret = generateWebhookSecret();
    const { error } = await supabase.from("user_webhooks").insert({
      user_id: user.id,
      url: checked.url,
      events: [...parsed.data.events],
      secret_encrypted: secret.encrypted,
      secret_last_four: secret.lastFour,
    });
    if (error) return { status: "error", message: describeDbError(error.message) };

    revalidatePath(PATH);
    return { status: "ok", secret: secret.plaintext, lastFour: secret.lastFour };
  } catch (error) {
    logger.warn("failed to create webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not save the endpoint." };
  }
}

/**
 * Replaces the signing secret and returns the new one once.
 *
 * Rotation is immediate rather than overlapping: there is one valid secret at a
 * time, so a receiver that has not been updated will start failing signature
 * checks. Overlapping secrets would need a second hash column and a expiry, and
 * that is only worth building once deliveries actually exist.
 */
export async function rotateWebhookSecret(id: string): Promise<SecretResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };
  if (!(await callerHasIntegrations())) return { status: "error", message: INTEGRATIONS_DENIAL };
  // Without the key there is nothing to sign a delivery with, so an endpoint
  // registered now would be stored and never used. Refused up front rather than
  // accepted and quietly inert.
  if (!isWebhookSigningConfigured) {
    return { status: "error", message: "Webhook signing is not configured yet." };
  }

  try {
    const supabase = await createClient();
    const secret = generateWebhookSecret();
    // RLS scopes the update to the caller's own rows, so an id belonging to
    // someone else matches nothing rather than rotating their secret.
    const { data, error } = await supabase
      .from("user_webhooks")
      .update({ secret_encrypted: secret.encrypted, secret_last_four: secret.lastFour })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { status: "error", message: "Endpoint not found." };

    revalidatePath(PATH);
    return { status: "ok", secret: secret.plaintext, lastFour: secret.lastFour };
  } catch (error) {
    logger.warn("failed to rotate webhook secret", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not rotate the secret." };
  }
}

/** Pauses or resumes an endpoint without discarding its secret. */
export async function setWebhookActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };
  // Resuming an endpoint is starting deliveries again, so it is gated the same
  // way creating one is. Pausing is not: stopping is always allowed.
  if (isActive && !(await callerHasIntegrations())) {
    return { status: "error", message: INTEGRATIONS_DENIAL };
  }
  try {
    const supabase = await createClient();
    // Selected back for the same reason `rotateWebhookSecret` above does: RLS
    // turns a foreign or already-gone id into a match against nothing rather
    // than an error, and without this that read as success.
    const { data, error } = await supabase
      .from("user_webhooks")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { status: "error", message: "Endpoint not found." };
    revalidatePath(PATH);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Could not update the endpoint." };
  }
}

/** Removes an endpoint. The secret goes with it and cannot be recovered. */
export async function deleteWebhook(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("user_webhooks").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { status: "error", message: "Endpoint not found." };
    revalidatePath(PATH);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Could not delete the endpoint." };
  }
}
