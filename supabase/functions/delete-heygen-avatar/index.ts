// Authenticated endpoint: erases the caller's digital twin, everywhere it is.
//
// The consent statement people read aloud on camera says the twin is theirs to
// "delete at any time from my settings". This is what makes that true. It ran
// for a while as a sentence with nothing behind it, which on biometric data is
// the worst kind of promise to leave unimplemented.
//
// Order matters, and it is provider first. If the provider call fails, the row
// stays and the person can try again; if the row went first, the twin would be
// invisible here and still trained over there, with nothing left pointing at it
// to delete.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { adminClient } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { deleteAvatarGroup, isHeygenConfigured } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

serve(async (request) => {
  const traceId = traceIdFrom(request);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as { avatarId?: string };
  const avatarId = (body.avatarId ?? "").trim();
  if (avatarId === "") return json({ error: "missing_avatar" }, 400);

  const admin = adminClient();
  /*
   * Matched on the id and the owner together. The id alone would let anybody
   * who learned a uuid delete somebody else's likeness, and this runs with the
   * service role, so nothing further down would stop them.
   */
  const { data, error } = await admin
    .from("heygen_avatars")
    .select("provider_avatar_id, orphaned_provider_avatar_ids, storage_path")
    .eq("id", avatarId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    log("error", "could not read the twin to delete", { traceId, error: error.message });
    return json({ error: "lookup_failed" }, 500);
  }

  const twin = data as {
    provider_avatar_id: string | null;
    orphaned_provider_avatar_ids: string[] | null;
    storage_path: string;
  } | null;
  // Nothing to delete is the same outcome as deleted, and saying so lets the
  // library be simple about a person pressing the button twice.
  if (!twin) return json({ deleted: true, alreadyGone: true });

  /*
   * Orphans are deleted alongside the live group.
   *
   * A duplicate dispatch used to leave earlier trained groups at the provider
   * with nothing in our schema pointing at them, so "delete my twin" removed
   * one copy of a face and left the others. Those ids are recorded now, and
   * this is where they get used.
   */
  const groups = [twin.provider_avatar_id, ...(twin.orphaned_provider_avatar_ids ?? [])].filter(
    (id): id is string => typeof id === "string" && id !== "",
  );

  if (groups.length > 0 && isHeygenConfigured()) {
    for (const group of groups) {
      try {
        await deleteAvatarGroup(group);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        log("error", "provider refused a twin deletion", { traceId, group, error: message });
        // Deliberately not swallowed. Reporting success while a copy of the
        // likeness still exists at the provider would be a lie about the one
        // thing this endpoint is for.
        return json({ error: "provider_delete_failed" }, 502);
      }
    }
  }

  /*
   * The training footage goes with it.
   *
   * Kept until now because a dispute about a likeness needs the source, not
   * only the provider's derived asset. Once the person has asked for the
   * likeness to be gone, holding the recording of their face and voice is
   * keeping the most sensitive part of what they asked us to erase.
   */
  const { error: storageError } = await admin.storage.from("uploads").remove([twin.storage_path]);
  if (storageError) {
    // Logged, not fatal: the row and the provider copy are the ones that make a
    // twin usable, and a stranded object is caught by the retention sweep.
    log("warn", "could not remove twin footage", { traceId, error: storageError.message });
  }

  const { error: deleteError } = await admin
    .from("heygen_avatars")
    .delete()
    .eq("id", avatarId)
    .eq("user_id", user.id);
  if (deleteError) {
    log("error", "could not delete the twin row", { traceId, error: deleteError.message });
    return json({ error: "delete_failed" }, 500);
  }

  /*
   * Handoff links are cleared only when the last avatar goes. They are scoped
   * to a person rather than to one likeness, so deleting one of several would
   * otherwise revoke a link the owner is part way through using for another.
   */
  const { count } = await admin
    .from("heygen_avatars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) === 0) {
    await admin.from("avatar_handoffs").delete().eq("user_id", user.id);
  }

  log("info", "twin deleted", { traceId });
  return json({ deleted: true, alreadyGone: false });
});
