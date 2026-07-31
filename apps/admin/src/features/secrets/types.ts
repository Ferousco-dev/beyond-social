/**
 * The registry's domain types.
 *
 * There is no value field on `ManagedSecret` and there is no type in this
 * module that carries one. A secret value exists in exactly one place in this
 * feature: the form field the admin types into, on its way to the database.
 * Nothing reads one back, so nothing needs a type for one.
 */

export const SECRET_LOCATIONS = ["vercel", "supabase", "host"] as const;

export type SecretLocation = (typeof SECRET_LOCATIONS)[number];

export interface ManagedSecret {
  readonly key: string;
  readonly description: string;
  /** Which service reads the value, so an operator knows what breaks. */
  readonly expectedBy: string;
  readonly location: SecretLocation;
  /** Null whenever the secret is not set. Never more than four characters. */
  readonly lastFour: string | null;
  readonly isSet: boolean;
  /** Whether an encrypted copy is held in the vault. Never the copy itself. */
  readonly hasStoredValue: boolean;
  readonly rotatedAt: string | null;
  readonly rotatedByEmail: string | null;
}

export interface LocationNote {
  /** Where an operator goes to change the value. */
  readonly label: string;
  /**
   * What has to happen before the running process sees the new value. This is
   * the whole reason the field exists: recording a rotation here changes the
   * registry, not the deployment, and every host applies a change differently.
   */
  readonly effect: string;
}

export const LOCATION_NOTES: Record<SecretLocation, LocationNote> = {
  vercel: {
    label: "Vercel project environment variables",
    effect:
      "Changing it in Vercel does not affect the running app. The new value is only picked up by a redeploy, so redeploy after you change it.",
  },
  supabase: {
    label: "Supabase edge function secrets",
    effect:
      "Set it with supabase secrets set. Function instances that are already warm keep the old value until they are recycled, so redeploy the functions to apply it immediately.",
  },
  host: {
    label: "The service's own environment",
    effect:
      "Set it where the process is configured, then restart the service. A running worker holds its environment from the moment it started.",
  },
};
