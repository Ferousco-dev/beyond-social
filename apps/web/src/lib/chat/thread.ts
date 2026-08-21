import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { canRunModel } from "@/lib/credits/queries";
import { DEFAULT_VIDEO_MODEL_ID } from "@/lib/generation/gate";
import { signRenders } from "@/lib/generation/render-url";

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
  // Every state the column can hold. `cancelled` was missing, and because a
  // parse failure drops the whole thread, cancelling one draft and reloading
  // emptied the conversation.
  generation_status: z.enum(["queued", "generating", "ready", "failed", "cancelled"]).nullable(),
  result_url: z.string().nullable(),
  // The durable fact. `result_url` is a public link that stopped resolving
  // when the bucket was closed, so playback is signed from this instead.
  result_path: z.string().nullable().default(null),
  // Defaulted, so a build running against a database that has not taken the
  // migration yet reads the thread rather than failing the whole parse.
  generation_model: z.string().nullable().default(null),
  // Why it failed, in the provider's words. Defaulted for the same reason.
  generation_error: z.string().nullable().default(null),
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
   * Which model produced it. Only some can continue their own output, so the
   * interface needs this to decide whether continuing is even on offer.
   */
  readonly model?: string | null;
  /**
   * Why it failed, when it failed. The provider's reason, or ours when the run
   * never reached the provider. Null while it is still running, and on a draft
   * the client has just created optimistically.
   */
  readonly error?: string | null;
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
  /**
   * What a video costs and what is left to pay for it.
   *
   * Carried on the thread because this is the screen that spends it. The
   * balance lived on the billing page and the overview tile and nowhere near
   * the composer, so the way to discover an empty account was to write a brief,
   * send it, and be refused. Null when there is no backend to ask.
   */
  readonly credits: { readonly cost: number; readonly balance: number } | null;
}

/**
 * `queued` and `generating` are both "not finished yet" to the reader, and a
 * cancelled render is one that produced nothing, which is what failed means
 * here. What separates them is the reason on the row, not the state.
 */
function toDraftStatus(status: string | null): DraftStatus {
  if (status === "ready") return "ready";
  if (status === "failed" || status === "cancelled") return "failed";
  return "generating";
}

function toMessage(
  row: z.infer<typeof rowSchema>,
  signed: ReadonlyMap<string, string>,
  renders: ReadonlyMap<string, string>,
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
          // Signed per read. A render with no path predates the private
          // bucket and has nothing playable left, which reads as null.
          resultUrl: row.result_path ? (renders.get(row.result_path) ?? null) : null,
          model: row.generation_model ?? null,
          error: row.generation_error,
          startedAt: row.created_at,
        }
      : undefined,
  };
}

const EMPTY: Thread = {
  projectId: null,
  title: "New project",
  messages: [],
  live: false,
  credits: null,
};

/**
 * What a run costs and what is left, or null when it cannot be established.
 *
 * `canRunModel` already returns both for the gate, so this asks the same
 * question rather than adding a second source that could disagree with the one
 * that actually refuses the run.
 */
async function creditsFor(): Promise<Thread["credits"]> {
  if (!isSupabaseConfigured) return null;

  const check = await canRunModel(DEFAULT_VIDEO_MODEL_ID);
  // A cost of zero means the catalogue could not price the model, which is not
  // the same as free and must not be shown as it.
  if (check.creditCost <= 0) return null;

  return { cost: check.creditCost, balance: check.balance };
}

/**
 * Loads one project's conversation.
 *
 * `new` is not a project id: it is the route for a thread that has no project
 * yet, and one is created on the first message rather than on page load, so
 * opening the composer and changing your mind leaves nothing behind.
 */
export async function getThread(id: string): Promise<Thread> {
  if (!isSupabaseConfigured) return EMPTY;

  // A brand new thread still spends credits on its first message, so it is told
  // the price like any other.
  if (id === "new") return { ...EMPTY, live: true, credits: await creditsFor() };

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { ...EMPTY, live: isSupabaseConfigured };

  const [{ data: project }, { data: rows }, credits] = await Promise.all([
    supabase.from("projects").select("id, title").eq("id", id).maybeSingle(),
    supabase.rpc("project_thread", { p_project: id }),
    creditsFor(),
  ]);

  const found = project as { id: string; title: string } | null;
  // A project the caller cannot see is indistinguishable from one that does not
  // exist, which is the correct answer to give either way.
  if (!found) return { ...EMPTY, live: true, credits };

  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success) {
    return { ...EMPTY, projectId: found.id, title: found.title, live: true, credits };
  }

  // One signing call for the whole thread, after parsing rather than during it,
  // so the number of round trips does not grow with the number of photos.
  const [signed, renders] = await Promise.all([
    signAttachmentPaths(
      supabase,
      parsed.data.flatMap((row) => row.attachments.map((attachment) => attachment.path)),
    ),
    signRenders(
      supabase,
      parsed.data.map((row) => row.result_path),
    ),
  ]);

  return {
    projectId: found.id,
    title: found.title,
    messages: parsed.data.map((row) => toMessage(row, signed, renders)),
    live: true,
    credits,
  };
}
