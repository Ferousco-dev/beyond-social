import { type AuthClient } from "./supabase";

/**
 * Step-up assurance for the console.
 *
 * `is_admin()` answers who someone is allowed to be, not how well they proved
 * it. On its own that makes a stolen password worth the whole console: one
 * factor, no second check, and every privileged screen behind it.
 *
 * Supabase models this as an assurance level. `aal1` is a password; `aal2` is a
 * password plus a verified second factor in this session. This module turns
 * that into one decision the middleware can act on.
 */

export const MFA_ENROL_PATH = "/security/enrol";
export const MFA_VERIFY_PATH = "/security/verify";

/** Reachable without a second factor, because they are how you get one. */
export const MFA_PATHS: readonly string[] = [MFA_ENROL_PATH, MFA_VERIFY_PATH];

/**
 * Whether the console refuses a single-factor session.
 *
 * **Defaults to off, and that is the important part.** Turning enforcement on
 * before anyone has enrolled would lock every admin out of the console that
 * grants console access, with no way back in through the product. The switch
 * belongs to whoever has already enrolled and confirmed it works.
 *
 * Enrolment does not wait for the flag: `/security/enrol` is reachable by any
 * admin at any time, which is what makes turning this on safe.
 */
export function mfaRequired(): boolean {
  return process.env.ADMIN_REQUIRE_MFA === "true";
}

export type AssuranceOutcome =
  /** Second factor verified in this session. */
  | { readonly state: "satisfied" }
  /** Has a factor, has not used it yet in this session. */
  | { readonly state: "verify" }
  /** Has no verified factor at all, so there is nothing to step up with. */
  | { readonly state: "enrol" }
  /** The level could not be established. */
  | { readonly state: "unknown"; readonly reason: string };

export async function assuranceOf(client: AuthClient): Promise<AssuranceOutcome> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || !data) {
    return { state: "unknown", reason: error?.message ?? "no assurance level returned" };
  }

  // `nextLevel` is aal2 exactly when the account has a verified factor, so it
  // is what separates "cannot step up" from "has not stepped up".
  if (data.nextLevel !== "aal2") return { state: "enrol" };
  return data.currentLevel === "aal2" ? { state: "satisfied" } : { state: "verify" };
}

/**
 * Where a request should go, or null to let it through.
 *
 * An unknown level is treated as not satisfied. It sends the caller to the
 * verify screen, which explains the state and offers a way out rather than
 * looping: that path is exempt from this check.
 */
export function mfaDestination(outcome: AssuranceOutcome): string | null {
  switch (outcome.state) {
    case "satisfied":
      return null;
    case "enrol":
      return MFA_ENROL_PATH;
    default:
      return MFA_VERIFY_PATH;
  }
}
