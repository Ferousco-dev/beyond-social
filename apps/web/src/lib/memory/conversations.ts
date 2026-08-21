import "server-only";

import { logger } from "@/lib/logger";
import { getEmbedder } from "@/lib/prompt-engine/providers";

import { type LazyEmbedding } from "./embed-once";
import { createClient } from "@/lib/supabase/server";

/**
 * Searching past conversations by meaning.
 *
 * The layer that answers "continue the project we discussed last month". The
 * thread cannot: that question is about a conversation the current thread has
 * never seen. Long-term memory cannot either: it holds distilled claims about a
 * person, not what they were working on in June.
 *
 * Only the user's own messages are indexed. Assistant replies are derivative,
 * and embedding them would double the cost to make searches match text the
 * assistant wrote rather than what the person asked for.
 */

/** Below this a message is "make it slower", which matches everything and means nothing. */
const MIN_INDEXABLE_LENGTH = 25;

/** Enough to recognise the conversation, short enough not to bloat the prompt. */
const SNIPPET_LENGTH = 200;

export interface RelatedConversation {
  readonly projectId: string;
  readonly title: string;
  readonly snippet: string;
  readonly similarity: number;
}

/**
 * Adds one message to the searchable index.
 *
 * Called after the turn is saved and never awaited by the caller. A message that
 * fails to index is invisible to future searches, which is a quiet loss of
 * quality; making the user wait for it, or failing their turn over it, would be
 * a loud one.
 */
export async function indexMessage(
  messageId: string,
  projectId: string,
  content: string,
): Promise<void> {
  const trimmed = content.trim();
  if (trimmed.length < MIN_INDEXABLE_LENGTH) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [vector] = await getEmbedder().embed([trimmed]);
    if (!vector) return;

    const { error } = await supabase.from("message_embeddings").upsert(
      {
        message_id: messageId,
        user_id: user.id,
        project_id: projectId,
        snippet: trimmed.slice(0, SNIPPET_LENGTH),
        embedding: vector,
      } as never,
      { onConflict: "message_id" },
    );
    if (error) throw new Error(error.message);
  } catch (error) {
    logger.warn("could not index message", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Past conversations relevant to what was just said, excluding the current one.
 *
 * Returns nothing most of the time, and that is the intended behaviour. The
 * similarity floor is deliberately high: a weak match dragged into the prompt is
 * worse than no match, because it invites the model to talk about unrelated work
 * as though it were the subject.
 */
export async function findRelatedConversations(
  query: string,
  currentProjectId: string | null,
  limit = 2,
  /**
   * The query embedded, asked for only here. Unlike recall there is no cheap
   * path: the question is which earlier conversation resembles this one, and
   * nothing but a comparison answers it.
   */
  getVector?: LazyEmbedding,
): Promise<readonly RelatedConversation[]> {
  if (query.trim().length < MIN_INDEXABLE_LENGTH) return [];

  try {
    const supabase = await createClient();
    const vector = getVector ? await getVector() : (await getEmbedder().embed([query]))[0];
    if (!vector) return [];

    const { data, error } = await supabase.rpc("match_conversations", {
      p_embedding: vector as never,
      p_limit: limit,
      ...(currentProjectId ? { p_exclude: currentProjectId } : {}),
    });
    if (error) throw new Error(error.message);

    return (
      (data ?? []) as {
        project_id: string;
        title: string;
        snippet: string;
        similarity: number;
      }[]
    ).map((row) => ({
      projectId: row.project_id,
      title: row.title,
      snippet: row.snippet,
      similarity: row.similarity,
    }));
  } catch (error) {
    logger.warn("could not search conversations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Renders related work for a prompt.
 *
 * Labelled as other conversations rather than this one, because the failure mode
 * is the model answering about the wrong project with total confidence. Fenced
 * for the same reason every other retrieved text is: this is the user's own
 * writing coming back into a prompt.
 */
export function renderRelated(conversations: readonly RelatedConversation[]): string {
  if (conversations.length === 0) return "";
  return [
    "Other work this person has done before, in separate conversations.",
    "Mention it only if they are clearly referring to it, and never assume this message is about it:",
    "<earlier_work>",
    ...conversations.map((item) => `- ${item.title}: ${item.snippet}`),
    "</earlier_work>",
  ].join("\n");
}
