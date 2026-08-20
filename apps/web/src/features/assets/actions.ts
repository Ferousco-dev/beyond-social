"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { classifySubject } from "@/lib/generation/likeness";
import { CONSENT_VERSION } from "@/features/generation/consent";
import { BRAND_ASSET_KINDS } from "@/lib/assets/brand";

/**
 * Keeping a picture for reuse.
 *
 * The bytes are already in storage by the time this runs: the browser uploads
 * straight to a signed URL from `createUploadTickets`, the same path every other
 * image takes. This records that the object is one the user wants to keep.
 *
 * Saving a likeness needs the attestation. Not because the upload did, though it
 * did, but because keeping one is a further promise: a photo sent for a single
 * render is gone when the thread is, and this one sits in a library until it is
 * deleted.
 */

const saveSchema = z.object({
  kind: z.enum(BRAND_ASSET_KINDS),
  path: z.string().min(1),
  label: z.string().trim().max(60).default(""),
});

const idSchema = z.object({ id: z.string().uuid() });

export type SaveResult =
  | { status: "ok" }
  | { status: "unconfigured" }
  /** The likeness attestation has not been given, so the UI should ask. */
  | { status: "consent" }
  | { status: "error"; message: string };

export type RemoveResult =
  { status: "ok" } | { status: "unconfigured" } | { status: "error"; message: string };

export async function saveBrandAsset(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That picture could not be saved." };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to save that." };

  // The path comes from the client, so ownership is re-checked rather than
  // assumed, as it is in every other action that takes one.
  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That picture could not be saved." };
  }

  const { kind, path, label } = parsed.data;

  if (kind === "avatar") {
    const { data: consent } = await supabase
      .from("likeness_consents")
      .select("id")
      .eq("statement_version", CONSENT_VERSION)
      .limit(1)
      .maybeSingle();
    if (consent === null) return { status: "consent" };
  } else {
    /*
     * A product shelf is not a place to put a person.
     *
     * Filing a face as a product would route it around the attestation
     * entirely, which is the one thing this split exists to prevent. The check
     * is on the image rather than on the user's word about it, and a
     * classification that fails resolves to `person`, which refuses: a wrongly
     * rejected product photo is an annoyance, the other way round is a real
     * face kept with nothing recorded.
     */
    const { data: object } = await supabase.storage.from("uploads").download(path);
    const subject = object
      ? await classifySubject(new Uint8Array(await object.arrayBuffer()), object.type)
      : "person";

    if (subject === "person") {
      return {
        status: "error",
        message: "That looks like a person. Save it as your avatar instead.",
      };
    }
  }

  /*
   * The avatar is replaced rather than upserted.
   *
   * Its uniqueness is a partial index, `where kind = 'avatar'`, which no
   * `on conflict` target can name: PostgREST cannot express the predicate, so an
   * upsert would look for a plain unique index on `user_id`, find none, and
   * fail. Clearing first is also what makes the old object removable, which an
   * upsert would have silently orphaned.
   */
  if (kind === "avatar") {
    const { data: previous } = await supabase
      .from("brand_assets")
      .select("storage_path")
      .eq("user_id", user.id)
      .eq("kind", "avatar")
      .maybeSingle();

    await supabase.from("brand_assets").delete().eq("user_id", user.id).eq("kind", "avatar");

    if (previous !== null && previous.storage_path !== path) {
      const { error: staleError } = await supabase.storage
        .from("uploads")
        .remove([previous.storage_path]);
      if (staleError) logger.warn("old avatar left behind", { error: staleError.message });
    }
  }

  const { error } = await supabase.from("brand_assets").insert({
    user_id: user.id,
    kind,
    storage_path: path,
    label,
    consent_version: kind === "avatar" ? CONSENT_VERSION : null,
  });

  if (error) {
    logger.error("could not save a brand asset", { error: error.message, kind });
    return { status: "error", message: "Could not save that just now." };
  }

  revalidatePath("/dashboard/assets");
  return { status: "ok" };
}

/** Removes the row and the object behind it, in that order. */
export async function removeBrandAsset(input: z.input<typeof idSchema>): Promise<RemoveResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Nothing to remove." };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to remove that." };

  // Read first, so the storage object can be removed too. Row-level security
  // scopes this to the owner, so a row that comes back is theirs.
  const { data: row } = await supabase
    .from("brand_assets")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (row === null) return { status: "ok" };

  const { error } = await supabase.from("brand_assets").delete().eq("id", parsed.data.id);
  if (error) {
    logger.error("could not remove a brand asset", { error: error.message });
    return { status: "error", message: "Could not remove that just now." };
  }

  // After the row, deliberately. An orphaned object is findable and cheap; a row
  // pointing at a deleted object renders as a broken picture with no way back.
  const { error: storageError } = await supabase.storage.from("uploads").remove([row.storage_path]);
  if (storageError) {
    logger.warn("brand asset object left behind", { error: storageError.message });
  }

  revalidatePath("/dashboard/assets");
  return { status: "ok" };
}
