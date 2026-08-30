import "server-only";

import { z } from "zod";

import { ATTACHMENT_KINDS, signAttachmentPaths } from "@/lib/chat/attachments";
import { isSupabaseConfigured } from "@/lib/env";
import { signRenders } from "@/lib/generation/render-url";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { type LibraryItem } from "./types";

/**
 * How many items one source contributes to one page of the library.
 *
 * Bounded rather than endless on purpose. Signing every object the account has
 * ever produced on every visit is a page that gets slower the longer someone
 * uses the product. Applied per source before the merge, so one busy source
 * cannot crowd the other out of the page; older items are reached with
 * `getLibraryItems(cursor)`, not by raising this.
 */
const PAGE_SIZE = 120;

/** What an untitled project is called, matching the thread header. */
const UNTITLED = "Untitled";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The project title as embedded by both reads below. */
const projectSchema = z.object({ title: z.string() }).nullable();

/*
 * `messages!inner` is what scopes the attachment read: an attachment is only
 * visible through a message, and the row-level policy on messages is keyed to
 * the owner, so the inner join is both the join and the authorisation. There is
 * no user id on `message_attachments` to filter on, and adding one would
 * duplicate a fact the join already establishes.
 */
const attachmentRowSchema = z.object({
  id: z.string(),
  kind: z.enum(ATTACHMENT_KINDS),
  storage_path: z.string().min(1),
  created_at: z.string(),
  messages: z.object({ project_id: z.string(), projects: projectSchema }),
});

const generationRowSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  result_path: z.string().min(1),
  created_at: z.string(),
  projects: projectSchema,
});

/**
 * Parses row by row rather than across the array.
 *
 * One row written by a newer shape than this build understands should cost that
 * one tile, not the whole page: the same failure that once made the models page
 * render "no models are listed yet" because of a single row.
 */
function parseRows<T>(rows: readonly unknown[], schema: z.ZodType<T>, what: string): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      logger.warn(`skipping an unreadable ${what} row`, { issues: parsed.error.issues });
      return [];
    }
    return [parsed.data];
  });
}

function titleOf(project: { title: string } | null): string {
  return project?.title.trim() || UNTITLED;
}

/** Photos and voice clips the user attached to a message. */
async function readAttachments(supabase: Supabase, before: string | null): Promise<LibraryItem[]> {
  let query = supabase
    .from("message_attachments")
    .select("id, kind, storage_path, created_at, messages!inner(project_id, projects(title))")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before !== null) query = query.lt("created_at", before);
  const { data, error } = await query;

  if (error !== null) {
    logger.warn("could not read library attachments", { error: error.message });
    return [];
  }

  const rows = parseRows(data ?? [], attachmentRowSchema, "attachment");
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
    projectTitle: titleOf(row.messages.projects),
    createdAt: row.created_at,
  }));
}

/**
 * Videos the user generated.
 *
 * Only `ready` rows with a stored path. A queued or failed generation has
 * nothing to show, and a row whose `result_path` is null predates the private
 * bucket, so there is no object to sign. `project_renders` is deliberately not
 * included: a stitched export is made from these same clips, so listing both
 * would show one video twice.
 */
async function readGenerations(supabase: Supabase, before: string | null): Promise<LibraryItem[]> {
  let query = supabase
    .from("video_generations")
    .select("id, project_id, result_path, created_at, projects(title)")
    .eq("status", "ready")
    .not("result_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before !== null) query = query.lt("created_at", before);
  const { data, error } = await query;

  if (error !== null) {
    logger.warn("could not read library generations", { error: error.message });
    return [];
  }

  const rows = parseRows(data ?? [], generationRowSchema, "generation");
  const signed = await signRenders(
    supabase,
    rows.map((row) => row.result_path),
  );

  return rows.map((row) => ({
    id: row.id,
    kind: "video" as const,
    path: row.result_path,
    url: signed.get(row.result_path) ?? null,
    projectId: row.project_id,
    projectTitle: titleOf(row.projects),
    createdAt: row.created_at,
  }));
}

export interface LibraryPage {
  readonly items: readonly LibraryItem[];
  /**
   * The `created_at` to page from next, or null when this page was not full
   * enough to promise more exist. Not the last item's timestamp: with two
   * sources merged and each independently capped at PAGE_SIZE, the older of
   * the two per-source cursors is what neither source has been exhausted
   * before, so re-querying from it cannot skip a row the merge simply
   * hadn't gotten to yet.
   */
  readonly nextCursor: string | null;
}

/**
 * One page of the library, newest first.
 *
 * `before` re-queries both sources with `created_at < before` rather than
 * slicing an already-fetched array, so paging back through history actually
 * reaches older items instead of the same bounded page every time.
 */
export async function getLibraryItems(before: string | null = null): Promise<LibraryPage> {
  if (!isSupabaseConfigured) return { items: [], nextCursor: null };

  const user = await getAuthUser();
  if (user === null) return { items: [], nextCursor: null };

  const supabase = await createClient();
  // Independent reads against different tables and buckets, so they run at once
  // rather than putting one round trip in front of the other.
  const [attachments, generations] = await Promise.all([
    readAttachments(supabase, before),
    readGenerations(supabase, before),
  ]);

  // Not sliced down to PAGE_SIZE: the cursor below is only safe to resume
  // from because every row fetched here is also returned. Trimming this to a
  // single page would silently drop whichever source's tail lost the merge,
  // and those rows would then never surface, since the next page starts
  // after this cursor.
  const merged = [...attachments, ...generations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  // A source that came back short of PAGE_SIZE has no more rows before this
  // cursor; only a source that came back full might still have older ones.
  // The oldest of those safe-to-continue-from cursors is where the next page
  // must start, so the merge cannot skip a row from whichever source it
  // hadn't reached yet.
  const exhaustedCursors = [
    attachments.length === PAGE_SIZE ? attachments[attachments.length - 1]?.createdAt : undefined,
    generations.length === PAGE_SIZE ? generations[generations.length - 1]?.createdAt : undefined,
  ].filter((cursor): cursor is string => cursor !== undefined);

  const nextCursor =
    exhaustedCursors.length > 0
      ? exhaustedCursors.reduce((oldest, cursor) => (cursor < oldest ? cursor : oldest))
      : null;

  return { items: merged, nextCursor };
}
