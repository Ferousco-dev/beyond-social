import "server-only";

import { z } from "zod";

import { ATTACHMENT_KINDS, signAttachmentPaths } from "@/lib/chat/attachments";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { type LibraryItem } from "./types";

/**
 * How many items one page of the library holds.
 *
 * Bounded rather than endless on purpose. An unbounded list signs every object
 * the account has ever uploaded on every visit, which is one storage round trip
 * per hundred items and a page that gets slower the longer someone uses the
 * product. Older items stay reachable through their thread.
 */
const PAGE_SIZE = 120;

/**
 * The embedded read.
 *
 * `messages!inner` is what scopes this: an attachment is only visible through a
 * message, and the row-level policy on messages is keyed to the owner, so the
 * inner join is both the filter and the authorisation. There is no user id on
 * `message_attachments` to filter on directly, and adding one would duplicate a
 * fact the join already establishes.
 */
const rowSchema = z.object({
  id: z.string(),
  kind: z.enum(ATTACHMENT_KINDS),
  storage_path: z.string().min(1),
  created_at: z.string(),
  messages: z.object({
    project_id: z.string(),
    projects: z.object({ title: z.string() }).nullable(),
  }),
});

/** What an untitled project is called, matching the thread header. */
const UNTITLED = "Untitled";

export async function getLibraryItems(): Promise<readonly LibraryItem[]> {
  if (!isSupabaseConfigured) return [];

  const user = await getAuthUser();
  if (user === null) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_attachments")
    .select("id, kind, storage_path, created_at, messages!inner(project_id, projects(title))")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error !== null) {
    logger.warn("could not read the library", { error: error.message });
    return [];
  }

  /*
   * Parsed per row rather than across the array. One attachment written by a
   * newer shape than this build understands should cost that one tile, not the
   * whole page: the same failure that once made the models page render "no
   * models are listed yet" when a single row did not fit.
   */
  const rows = (data ?? []).flatMap((row) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      logger.warn("skipping an unreadable library row", { issues: parsed.error.issues });
      return [];
    }
    return [parsed.data];
  });

  const signed = await signAttachmentPaths(
    supabase,
    rows.map((row) => row.storage_path),
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    path: row.storage_path,
    url: signed.get(row.storage_path) ?? null,
    projectId: row.messages.project_id,
    projectTitle: row.messages.projects?.title.trim() || UNTITLED,
    createdAt: row.created_at,
  }));
}
