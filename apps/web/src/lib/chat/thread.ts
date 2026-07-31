import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

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
});

export type DraftStatus = "generating" | "ready" | "failed";

export interface MessageDraft {
  readonly generationId: string;
  readonly status: DraftStatus;
  readonly resultUrl: string | null;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly draft?: MessageDraft;
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

function toMessage(row: z.infer<typeof rowSchema>): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    draft: row.generation_id
      ? {
          generationId: row.generation_id,
          status: toDraftStatus(row.generation_status),
          resultUrl: row.result_url,
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
  return {
    projectId: found.id,
    title: found.title,
    messages: parsed.success ? parsed.data.map(toMessage) : [],
    live: true,
  };
}
