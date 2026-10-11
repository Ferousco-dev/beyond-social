import { NextResponse } from "next/server";
import { z } from "zod";

import { isPromptEngineConfigured, serverEnv } from "@/lib/server-env";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { promoteCandidate, rejectCandidate } from "@/lib/prompt-engine/learn";

/**
 * Deciding a learning candidate, on behalf of the admin console.
 *
 * The console owns the review surface and this app owns the engine, and that
 * split is deliberate. Promotion is not a status change: a merge candidate is
 * re-resolved against the corpus before it lands, which needs the embedder and
 * the vector store. Giving the console those would mean handing an operator
 * tool the whole retrieval stack to change one row.
 *
 * Not a user-facing route. It is called server to server with a shared secret,
 * the same shape as the cron endpoints, and the console has already established
 * that the caller is an admin and written its own audit row before it gets
 * here.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  candidateId: z.string().min(1),
  action: z.enum(["promote", "reject"]),
  /** Kept on the engine's own audit trail, so a refusal says why. */
  reason: z.string().max(500).default(""),
});

export const POST = withTrace("POST /api/internal/learning", async (request) => {
  const secret = serverEnv.INTERNAL_API_SECRET;
  // An unset secret closes the route rather than opening it. A comparison
  // against "" would let any caller with no header through.
  if (secret === "" || request.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPromptEngineConfigured) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { candidateId, action, reason } = parsed.data;
  try {
    if (action === "promote") await promoteCandidate(candidateId);
    else await rejectCandidate(candidateId, reason || "Rejected in review");
    logger.info("learning candidate decided", { candidateId, action });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("learning decision failed", { candidateId, action, error: message });
    // The reason reaches the console, which is an operator surface: "it failed"
    // with no cause is what sends somebody to the server logs for a stale merge
    // target that the message already names.
    return NextResponse.json({ error: "decision_failed", message }, { status: 500 });
  }
});
