import "server-only";

import { CONSENT_VERSION } from "@/features/generation/consent";
import { type createClient } from "@/lib/supabase/server";

/**
 * Whether this turn needs a likeness attestation, and whether it has one.
 *
 * Consent is asked for when a photo of a person is attached, not whenever a
 * photo is attached. Animating a product shot is not a likeness question, and
 * asking anyway would train people to click through the one dialog that has to
 * be read.
 *
 * The avatar path has always gated on this. Image-to-video did not, which meant
 * the newest way to animate a real person's face was also the only one with no
 * attestation behind it at all.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * True when at least one of these uploads was classified as showing a person.
 *
 * An unclassified row counts as a person. Classification can fail, and the
 * absence of an answer is not evidence of absence: treating null as "not a
 * person" would turn every vision outage into a silent hole in the gate.
 */
export async function attachmentsShowAPerson(
  supabase: Supabase,
  userId: string,
  paths: readonly string[],
): Promise<boolean> {
  if (paths.length === 0) return false;

  const { data, error } = await supabase
    .from("assets")
    .select("storage_path, contains_person")
    .eq("user_id", userId)
    .in("storage_path", [...paths]);

  // A failed lookup is not a licence to skip the gate.
  if (error !== null || data === null) return true;

  const known = new Map(data.map((row) => [row.storage_path, row.contains_person]));
  // A path with no row at all is unknown, and unknown means ask.
  return paths.some((path) => known.get(path) !== false);
}

/** Whether the caller has accepted the current wording. */
export async function hasCurrentConsent(supabase: Supabase, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("likeness_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("statement_version", CONSENT_VERSION)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

/**
 * The whole question in one call: may this turn proceed?
 *
 * Checked before the project is created and before anything is persisted, so a
 * refusal leaves nothing behind and the client can ask, record, and send the
 * same message again cleanly.
 */
export async function needsLikenessConsent(
  supabase: Supabase,
  userId: string,
  photoPaths: readonly string[],
): Promise<boolean> {
  if (!(await attachmentsShowAPerson(supabase, userId, photoPaths))) return false;
  return !(await hasCurrentConsent(supabase, userId));
}
