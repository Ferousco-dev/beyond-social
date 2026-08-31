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

/**
 * Where to resume each source independently.
 *
 * A single shared `created_at` cursor cannot tell "this source has more
 * rows older than the cursor" apart from "this source ran dry pages ago and
 * every row it has is already in a page the caller was given": a source
 * smaller than PAGE_SIZE returns every remaining row well before the other
 * source catches up, and re-querying it again from a later, unrelated
 * cursor re-returns whatever of its own already-shown rows happen to be
 * older than that cursor. `done` is what actually remembers a source is
 * finished, independent of what the other source's cursor has moved to.
 */
export interface LibraryCursor {
  readonly attachmentsBefore: string | null;
  readonly attachmentsDone: boolean;
  readonly generationsBefore: string | null;
  readonly generationsDone: boolean;
}

export interface LibraryPage {
  readonly items: readonly LibraryItem[];
  /** Where to resume from next, or null once both sources are done. */
  readonly nextCursor: LibraryCursor | null;
}

/**
 * One page of the library, newest first.
 *
 * Each source pages independently and stops being queried the moment it
 * returns fewer than PAGE_SIZE rows, so a source smaller than the other
 * never gets re-queried into returning rows it already gave out.
 */
export async function getLibraryItems(cursor: LibraryCursor | null = null): Promise<LibraryPage> {
  if (!isSupabaseConfigured) return { items: [], nextCursor: null };

  const user = await getAuthUser();
  if (user === null) return { items: [], nextCursor: null };

  const supabase = await createClient();
  const attachmentsDone = cursor?.attachmentsDone ?? false;
  const generationsDone = cursor?.generationsDone ?? false;

  // Independent reads against different tables and buckets, so they run at once
  // rather than putting one round trip in front of the other. A source already
  // marked done is skipped rather than re-queried with a cursor that belongs
  // to the other source's progress.
  const [attachments, generations] = await Promise.all([
    attachmentsDone
      ? Promise.resolve([])
      : readAttachments(supabase, cursor?.attachmentsBefore ?? null),
    generationsDone
      ? Promise.resolve([])
      : readGenerations(supabase, cursor?.generationsBefore ?? null),
  ]);

  // Not sliced down to PAGE_SIZE: every row fetched here is also returned, or
  // a source's tail would silently drop out of the merge and never surface.
  const merged = [...attachments, ...generations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const nextAttachmentsDone = attachmentsDone || attachments.length < PAGE_SIZE;
  const nextGenerationsDone = generationsDone || generations.length < PAGE_SIZE;

  const nextCursor: LibraryCursor | null =
    nextAttachmentsDone && nextGenerationsDone
      ? null
      : {
          attachmentsBefore: attachments.at(-1)?.createdAt ?? cursor?.attachmentsBefore ?? null,
          attachmentsDone: nextAttachmentsDone,
          generationsBefore: generations.at(-1)?.createdAt ?? cursor?.generationsBefore ?? null,
          generationsDone: nextGenerationsDone,
        };

  return { items: merged, nextCursor };
}
