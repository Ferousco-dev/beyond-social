import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { type Attachment, attachmentRowSchema, signAttachmentPaths } from "./attachments";

export { type Attachment, type AttachmentKind } from "./attachments";

/**
 * Reading a conversation.
 *
 * The thread is the product's memory. It used to live in React state, which
 * meant a refresh discarded everything the user had said and every draft they
 * had made; the tables existed but nothing wrote to them.
 */

const rowSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  created_at: z.string(),
  generation_id: z.string().nullable(),
  generation_status: z.enum(["queued", "generating", "ready", "failed"]).nullable(),
  result_url: z.string().nullable(),
  // `project_thread` coalesces to an empty array, so this is never null. The
  // default covers a stale build reading a thread before the migration lands.
  attachments: z.array(attachmentRowSchema).default([]),
});

export type DraftStatus = "generating" | "ready" | "failed";

export interface MessageDraft {
  readonly generationId: string;
  readonly status: DraftStatus;
  readonly resultUrl: string | null;
  /**
   * When the turn was recorded, ISO 8601. Absent on a draft the client has
   * just created optimistically, which has not been persisted yet.
   *
   * Carried so the "generating" elapsed time survives a navigation. Counted
   * from mount, leaving the page and coming back restarted it at zero, which
   * made a render that had been running two minutes look like it had just
   * begun.
   */
  readonly startedAt?: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly draft?: MessageDraft;
  /** What was sent with the message. Empty for almost every assistant turn. */
  readonly attachments: readonly Attachment[];
}

export interface Thread {
  readonly projectId: string | null;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
  /** False when there is no backend, so the UI can explain itself. */
  readonly live: boolean;
}

/** `queued` and `generating` are both "not finished yet" to the reader. */
function toDraftStatus(status: string | null): DraftStatus {
  if (status === "ready") return "ready";
  if (status === "failed") return "failed";
  return "generating";
}

function toMessage(
  row: z.infer<typeof rowSchema>,
  signed: ReadonlyMap<string, string>,
): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: row.attachments.map((attachment) => ({
      ...attachment,
      url: signed.get(attachment.path) ?? null,
    })),
    draft: row.generation_id
      ? {
          generationId: row.generation_id,
          status: toDraftStatus(row.generation_status),
          resultUrl: row.result_url,
          startedAt: row.created_at,
        }
      : undefined,
  };
}

const EMPTY: Thread = { projectId: null, title: "New project", messages: [], live: false };

/**
 * Loads one project's conversation.
 *
 * `new` is not a project id: it is the route for a thread that has no project
 * yet, and one is created on the first message rather than on page load, so
 * opening the composer and changing your mind leaves nothing behind.
 */
export async function getThread(id: string): Promise<Thread> {
  if (!isSupabaseConfigured || id === "new") return { ...EMPTY, live: isSupabaseConfigured };

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { ...EMPTY, live: isSupabaseConfigured };

  const [{ data: project }, { data: rows }] = await Promise.all([
    supabase.from("projects").select("id, title").eq("id", id).maybeSingle(),
    supabase.rpc("project_thread", { p_project: id }),
  ]);

  const found = project as { id: string; title: string } | null;
  // A project the caller cannot see is indistinguishable from one that does not
  // exist, which is the correct answer to give either way.
  if (!found) return { ...EMPTY, live: true };

  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success) return { ...EMPTY, projectId: found.id, title: found.title, live: true };

  // One signing call for the whole thread, after parsing rather than during it,
  // so the number of round trips does not grow with the number of photos.
  const signed = await signAttachmentPaths(
    supabase,
    parsed.data.flatMap((row) => row.attachments.map((attachment) => attachment.path)),
  );

  return {
    projectId: found.id,
    title: found.title,
    messages: parsed.data.map((row) => toMessage(row, signed)),
    live: true,
  };
}
