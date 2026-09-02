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

const COLUMNS = "id, provider_look_id, provider_voice_id, training_status";

/**
 * The twin a request should use.
 *
 * Ordered default first and then newest, which is the order the library already
 * lists them in, so somebody with no default marked still gets the avatar their
 * screen shows at the top rather than an arbitrary one. Read under the caller's
 * own client, so row-level security is what scopes it to their avatars and a
 * named id belonging to somebody else is simply not found.
 */
export async function findTwin(
  supabase: SupabaseClient,
  avatarId: string | undefined,
): Promise<TwinLookup> {
  const query = supabase.from("heygen_avatars").select(COLUMNS);
  const { data, error } = await (avatarId
    ? query.eq("id", avatarId).limit(1)
    : query
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1));

  if (error) return { ok: false, error: "lookup_failed", status: 500, detail: error.message };

  const row = ((data ?? []) as TwinRow[])[0] ?? null;
  if (!row) return { ok: false, error: "no_avatar", status: 404 };

  if (row.training_status !== "ready") {
    // Distinguished from "no avatar" on purpose: one means record yourself, the
    // other means wait, and telling somebody to record again while their first
    // recording is still training is how they end up with two.
    return { ok: false, error: "not_ready", status: 409, detail: row.training_status };
  }
  if (!row.provider_look_id || !row.provider_voice_id) {
    return { ok: false, error: "incomplete_avatar", status: 409 };
  }

  return {
    ok: true,
    twin: { id: row.id, lookId: row.provider_look_id, voiceId: row.provider_voice_id },
  };
}
