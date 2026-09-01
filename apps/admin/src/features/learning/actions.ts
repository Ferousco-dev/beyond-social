"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/auth/supabase";
import { requireAdmin } from "@/lib/auth/require-admin";
import { clientIp } from "@/lib/auth/request";

export type ReviewState = { status: "idle" } | { status: "done" } | { status: "error"; message: string };

const submissionSchema = z.object({
  candidateId: z.string().min(1),
  action: z.enum(["promote", "reject"]),
  reason: z.string().max(500).default(""),
});

interface AuditRpcClient {
  rpc(
    fn: string,
    args?: Record<string, string | null>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Decides one learning candidate.
 *
 * The decision itself is made by the web app, which owns the engine: promoting
 * a merge candidate re-resolves it against the corpus first, and that needs the
 * embedder and the vector store. Handing an operator console the retrieval
 * stack to change one row would be the wrong trade.
 *
 * The audit row is written here and written first. If the console cannot record
 * who did this, the change does not happen: an unaudited privileged action is
 * not allowed in this app, and a decision that has already landed cannot be
 * un-taken once the log write fails after it.
 */
export async function decideCandidateAction(
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();

  const submission = submissionSchema.safeParse({
    candidateId: formData.get("candidateId"),
    action: formData.get("action"),
    reason: formData.get("reason") ?? "",
  });
  if (!submission.success) {
    return { status: "error", message: "That submission could not be read." };
  }
  const { candidateId, action, reason } = submission.data;

  const endpoint = process.env.WEB_APP_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!endpoint || !secret) {
    return {
      status: "error",
      message:
        "This console cannot reach the app that owns the knowledge base. Set WEB_APP_URL and INTERNAL_API_SECRET.",
    };
  }

  const supabase = (await createClient()) as unknown as AuditRpcClient;
  const { error: auditError } = await supabase.rpc("admin_log_action", {
    p_action: action === "promote" ? "learning.promote" : "learning.reject",
    p_target_type: "learning_candidate",
    p_target_id: candidateId,
    p_summary:
      action === "promote"
        ? `${admin.email} promoted a learned chunk into the knowledge base`
        : `${admin.email} rejected a learned chunk: ${reason || "no reason given"}`,
    p_ip: clientIp(await headers()),
  });
  if (auditError) {
    return { status: "error", message: `Nothing was changed: ${auditError.message}` };
  }

  try {
    const response = await fetch(`${endpoint}/api/internal/learning`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ candidateId, action, reason }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { message?: string } | null;
      // The audit row already says this was attempted, which is the honest
      // record: it was, and it failed.
      return {
        status: "error",
        message: detail?.message ?? `The knowledge base refused that (${response.status}).`,
      };
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "The knowledge base could not be reached.",
    };
  }

  revalidatePath("/learning");
  return { status: "done" };
}
