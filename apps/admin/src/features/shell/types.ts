import { z } from "zod";

/**
 * The signed in operator, as the shell needs it.
 *
 * Authentication is not wired into the console yet, so the shell treats this as
 * optional and says plainly when it is absent rather than showing a placeholder
 * name. The schema is here so whoever wires the session validates at that
 * boundary instead of casting.
 */
export const adminIdentitySchema = z.object({
  email: z.string().email(),
  /** Two letters at most, derived from the email or a display name. */
  initials: z.string().min(1).max(2),
});

export type AdminIdentity = z.infer<typeof adminIdentitySchema>;
