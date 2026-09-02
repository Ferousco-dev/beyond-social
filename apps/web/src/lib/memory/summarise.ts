import "server-only";

import { logger } from "@/lib/logger";
import { getChat } from "@/lib/prompt-engine/providers";
import { fenceSafe } from "@/lib/text/fence";
import { createClient } from "@/lib/supabase/server";

/**
 * Rolling conversation summary.
 *
 * A long thread cannot keep being sent in full. Every turn would carry every
 * earlier turn, so cost and latency grow with the length of the conversation
 * while the useful signal stays roughly constant.
 *
 * The summary replaces the middle of the thread, not the end. Recent turns are
 * still sent verbatim, because "make it slower" refers to something specific
 * that a summary would have flattened into "discussed pacing".
 */

/** Below this a thread is cheap enough to send whole, so summarising is wasted. */
const SUMMARISE_AFTER = 20;

/** Kept short on purpose: a summary that grows without bound is the thing it replaced. */
const MAX_WORDS = 150;

interface Turn {
  readonly role: string;
  readonly content: string;
}

function prompt(existing: string | null, turns: readonly Turn[]): string {
  return [
    existing
      ? "Update the running summary of this conversation with what has happened since."
      : "Write a running summary of this conversation.",
    "",
    "Keep what still matters for continuing the work: what they are making, for whom, decisions taken, and constraints they stated.",
    "Drop pleasantries, dead ends, and anything already superseded by a later decision.",
    `Stay under ${MAX_WORDS} words. Write plain sentences, no bullets, no preamble.`,
    "",
    existing ? `<summary_so_far>\n${fenceSafe(existing)}\n</summary_so_far>\n` : "",
    // Fenced: a transcript to compress, not instructions to obey.
    "<new_turns>",
    ...turns.map((turn) => `${turn.role}: ${fenceSafe(turn.content.slice(0, 600))}`),
    "</new_turns>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Brings the stored summary up to date, when the thread is long enough to be
 * worth it. Returns nothing: this runs after the user already has their answer.
 *
 * Never throws. A missing summary costs prompt efficiency, never correctness,
 * because the recent turns are sent either way.
 */
export async function updateSummary(projectId: string, turns: readonly Turn[]): Promise<void> {
  if (turns.length < SUMMARISE_AFTER) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("conversation_summaries")
      .select("summary, message_count")
      .eq("project_id", projectId)
      .maybeSingle();

    // Only summarise again once the thread has moved on meaningfully. Without
    // this, every turn past the threshold pays for a model call that restates
    // what is already stored.
    const covered = existing?.message_count ?? 0;
    if (turns.length - covered < SUMMARISE_AFTER / 2) return;

    const summary = await getChat().complete({
      system:
        "You keep a running summary of a working conversation. You are terse, you keep decisions and constraints, and you drop everything that no longer matters.",
      messages: [
        { role: "user", content: prompt(existing?.summary ?? null, turns.slice(covered)) },
      ],
      temperature: 0.2,
      maxTokens: 400,
    });

    const trimmed = summary.trim();
    if (trimmed === "") return;

    /*
     * Through an RPC rather than an upsert, because the compare and the write
     * have to happen together.
     *
     * The count read above was read before a model call that takes seconds. Two
     * refreshes overlapping, which is ordinary here because this runs after the
     * response is already on its way, both pass that check and the slower one
     * lands last, replacing a newer summary with one describing less of the
     * conversation. Versioning in this file would only move the race.
     */
    const { data: written, error } = await supabase.rpc("upsert_conversation_summary", {
      p_project: projectId,
      p_user: user.id,
      p_summary: trimmed,
      p_covered_through: new Date().toISOString(),
      p_message_count: turns.length,
    });
    if (error) throw new Error(error.message);

    if (written !== true) {
      // Not a failure. A newer summary is already stored, so this one is the
      // stale writer and dropping it is the point.
      logger.info("summary superseded before it was written", { projectId });
      return;
    }

    logger.info("conversation summarised", { projectId, turns: turns.length });
  } catch (error) {
    logger.warn("could not summarise conversation", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The stored summary for a thread, or null when it is still short. */
export async function getSummary(projectId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("conversation_summaries")
      .select("summary")
      .eq("project_id", projectId)
      .maybeSingle();
    return data?.summary ?? null;
  } catch {
    return null;
  }
}
