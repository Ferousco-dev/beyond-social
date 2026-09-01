import "server-only";

import { z } from "zod";

import { createPrivilegedClient } from "@/lib/auth/supabase";

/**
 * Minimal view of the Supabase client for the learning RPCs, matching the
 * config and health adapters. The console ships no generated database types, so
 * the narrowing happens here and every row is parsed by Zod before use.
 */
interface LearningRpcClient {
  rpc(
    fn: string,
    args?: Record<string, string | null>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Reading the learning review queue.
 *
 * The engine files everything it does not auto-promote as `pending`, and
 * auto-promotion is off by default, so this queue is where learned knowledge
 * goes. Nothing has ever listed it: the pipeline had a review step and no
 * reviewer, which is a gate that only ever closes.
 *
 * Read straight from the engine's own function rather than through the web app,
 * because a list is a read and the console already holds a service client. Only
 * deciding a candidate needs the engine, and that goes over the wire.
 */

/** Narrowed to what a reviewer needs. The stored candidate carries more. */
const candidateSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
  sourceRef: z.string().nullable().default(null),
  targetChunkId: z.string().nullable().default(null),
  draft: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    body: z.string(),
  }),
  evaluation: z.object({
    overall: z.number(),
    confidence: z.number(),
    decision: z.string(),
    decisionReason: z.string(),
    maxSimilarity: z.number().nullable().default(null),
  }),
});

export type ReviewCandidate = z.infer<typeof candidateSchema>;

/**
 * Pending candidates, newest first.
 *
 * Returns null rather than an empty list when the read fails, so the page can
 * say the queue could not be read instead of saying there is nothing in it.
 * Those are opposite facts and look identical once both render as "none".
 */
export async function fetchPendingCandidates(): Promise<ReviewCandidate[] | null> {
  try {
    const client = createPrivilegedClient() as unknown as LearningRpcClient;
    const { data, error } = await client.rpc("prompt_list_candidates", {
      p_status: "pending",
      p_workspace: null,
    });
    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? data : [];
    // Validated per row: one malformed candidate must not empty the queue for
    // every other one, which is the failure this schema exists to survive.
    const parsed: ReviewCandidate[] = [];
    for (const row of rows) {
      const unwrapped = (row as { candidate?: unknown })?.candidate ?? row;
      const candidate = candidateSchema.safeParse(unwrapped);
      if (candidate.success) parsed.push(candidate.data);
    }
    return parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return null;
  }
}
