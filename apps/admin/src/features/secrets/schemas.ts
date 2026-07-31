import { z } from "zod";

import { SECRET_LOCATIONS } from "./types";

/**
 * The boundaries of this feature: rows coming out of `admin_secrets_list` and
 * the form going in to `admin_secret_rotate`.
 *
 * The RPC layer is untyped until the generated database types exist, so this
 * schema is the real contract with migration 0034 rather than a formality.
 */
export const secretRowSchema = z.object({
  key: z.string(),
  description: z.string(),
  expected_by: z.string(),
  location: z.enum(SECRET_LOCATIONS),
  last_four: z.string().length(4).nullable(),
  is_set: z.boolean(),
  has_stored_value: z.boolean(),
  rotated_at: z.string().nullable(),
  rotated_by_email: z.string().nullable(),
});

/**
 * The rotation form.
 *
 * The minimum matches the database's own check so a short value is refused
 * before it travels, and the key pattern matches the table's, so a tampered
 * form field fails here rather than reaching Postgres as an unknown secret.
 */
export const rotateInputSchema = z.object({
  key: z.string().regex(/^[A-Z][A-Z0-9_]{2,60}$/, "That is not a secret in this registry."),
  value: z.string().min(12, "A secret value must be at least 12 characters."),
  storeValue: z.boolean(),
});

export const clearInputSchema = rotateInputSchema.pick({ key: true });

export type SecretRow = z.infer<typeof secretRowSchema>;
