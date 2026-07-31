import "server-only";

import { callSecretsRpc } from "./rpc";
import { secretRowSchema } from "./schemas";
import { type ManagedSecret } from "./types";

/**
 * The registry, as the console shows it.
 *
 * Read from `public.managed_secrets` through an admin-gated definer function,
 * never from `process.env`. The console runs in its own deployment, so its
 * environment says nothing about what the worker, the mail service or the edge
 * runtime were given, and a page built on it would report confidently on
 * secrets it cannot see.
 *
 * Returns null when the read fails, which the caller renders as "could not be
 * read" rather than as an empty registry.
 */
export async function fetchSecrets(): Promise<readonly ManagedSecret[] | null> {
  const { data, error } = await callSecretsRpc("admin_secrets_list");
  if (error) return null;

  const parsed = secretRowSchema.array().safeParse(data);
  if (!parsed.success) return null;

  return parsed.data.map((row) => ({
    key: row.key,
    description: row.description,
    expectedBy: row.expected_by,
    location: row.location,
    lastFour: row.last_four,
    isSet: row.is_set,
    hasStoredValue: row.has_stored_value,
    rotatedAt: row.rotated_at,
    rotatedByEmail: row.rotated_by_email,
  }));
}
