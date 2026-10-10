// Which likeness speaks.
//
// Since 0096 a person may hold several trained twins, so "the caller's twin" is
// no longer a row you can go and fetch. It is either the one they named or the
// one they marked as the default, and asking for it without saying which was a
// live error rather than a wrong answer: `.maybeSingle()` on `user_id` throws
// the moment somebody records a second avatar.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Twin {
  readonly id: string;
  readonly lookId: string;
  readonly voiceId: string;
}

/** Why a twin cannot be used, in the same vocabulary the endpoint returns. */
export type TwinLookup =
  | { readonly ok: true; readonly twin: Twin }
  | {
      readonly ok: false;
      readonly error: string;
      readonly status: 404 | 409 | 500;
      readonly detail?: string;
    };

interface TwinRow {
  id: string;
  provider_look_id: string | null;
  provider_voice_id: string | null;
  training_status: string;
}

interface VoiceRow {
  provider_voice_id: string | null;
  clone_status: string;
}

const COLUMNS = "id, provider_look_id, provider_voice_id, training_status";

/**
 * The twin a request should use.
 *
 * Ordered default first and then newest, which is the order the library already
 * lists them in, so somebody with no default marked still gets the avatar their
 * screen shows at the top rather than an arbitrary one. Read under the caller's
 * own client, so row-level security is what scopes it to their avatars and a
 * named id belonging to somebody else is simply not found.
 *
 * The voice that speaks is never the twin's own `provider_voice_id`: that is a
 * generic voice HeyGen auto-assigns the moment training finishes, not the
 * caller's voice, and a digital twin of somebody that does not sound like them
 * is not the product. `voice_profiles` is account-level, one per user rather
 * than one per avatar, because it is the same recorded voice whichever twin is
 * speaking. So a twin is only ever "ready" once training finished AND that
 * account's voice has been cloned; either alone is the "1/2" the library shows.
 */
export async function findTwin(
  supabase: SupabaseClient,
  avatarId: string | undefined,
): Promise<TwinLookup> {
  const query = supabase.from("heygen_avatars").select(COLUMNS);
  const [{ data, error }, { data: voiceData, error: voiceError }] = await Promise.all([
    avatarId
      ? query.eq("id", avatarId).limit(1)
      : query
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
    supabase
      .from("voice_profiles")
      .select("provider_voice_id, clone_status")
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) return { ok: false, error: "lookup_failed", status: 500, detail: error.message };
  if (voiceError) {
    return { ok: false, error: "lookup_failed", status: 500, detail: voiceError.message };
  }

  const row = ((data ?? []) as TwinRow[])[0] ?? null;
  if (!row) return { ok: false, error: "no_avatar", status: 404 };

  if (row.training_status !== "ready") {
    // Distinguished from "no avatar" on purpose: one means record yourself, the
    // other means wait, and telling somebody to record again while their first
    // recording is still training is how they end up with two.
    return { ok: false, error: "not_ready", status: 409, detail: row.training_status };
  }
  if (!row.provider_look_id) {
    return { ok: false, error: "incomplete_avatar", status: 409 };
  }

  const voice = voiceData as VoiceRow | null;
  if (!voice || voice.clone_status !== "ready" || !voice.provider_voice_id) {
    // The half of "1/2" the twin itself cannot fix: training finished, but
    // there is no cloned voice yet for it to speak in.
    return { ok: false, error: "voice_not_ready", status: 409, detail: voice?.clone_status ?? "none" };
  }

  return {
    ok: true,
    twin: { id: row.id, lookId: row.provider_look_id, voiceId: voice.provider_voice_id },
  };
}
