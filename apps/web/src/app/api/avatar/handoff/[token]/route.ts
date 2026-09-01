import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { hashHandoffToken, looksLikeHandoffToken } from "@/features/live-avatar/handoff";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * What the phone is allowed to do with a handoff link.
 *
 * The device on the other end has no session: it was handed a capability by
 * QR code and nothing else. So every decision here is made from the token, the
 * service role is used because nobody is signed in, and the two things the
 * phone could otherwise choose for itself, whose account this lands in and
 * where in storage it goes, are both decided on this side.
 *
 * POST issues an upload ticket. PUT claims the handoff once the object is
 * there. They are separate because the upload itself goes straight from the
 * phone to storage: a minute of 1080p video is tens of megabytes, and routing
 * that through a serverless function would fail on body size long before it
 * failed on anything interesting.
 */
export const dynamic = "force-dynamic";

/** Matches what the recorder can produce, plus what a phone camera roll holds. */
const EXTENSIONS: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const ticketSchema = z.object({
  contentType: z.string().refine((value) => value.split(";")[0]! in EXTENSIONS, {
    message: "Unsupported video format",
  }),
});

const claimSchema = z.object({ path: z.string().min(1).max(300) });

/**
 * The token, from the path.
 *
 * Read here rather than from the route's params because `withTrace` wraps a
 * handler that takes only the request, and losing the trace on this route to
 * gain a parameter that is already in the URL would be the wrong trade.
 */
function tokenFrom(request: Request): string {
  return new URL(request.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

/** Resolves the token to its owner, or null. Silent about why, on purpose. */
async function ownerOf(token: string): Promise<string | null> {
  if (!looksLikeHandoffToken(token)) return null;
  const { data, error } = await createServiceClient().rpc("resolve_avatar_handoff", {
    p_token_hash: hashHandoffToken(token),
  });
  if (error) {
    logger.warn("could not resolve an avatar handoff", { error: error.message });
    return null;
  }
  return (data as { user_id: string }[] | null)?.[0]?.user_id ?? null;
}

export const POST = withTrace("POST /api/avatar/handoff", async (request) => {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const userId = await ownerOf(tokenFrom(request));
  // One answer for expired, claimed, malformed and never-existed. Distinguishing
  // them tells an unauthenticated caller whether a token exists.
  if (!userId) return NextResponse.json({ error: "invalid_link" }, { status: 404 });

  const parsed = ticketSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "unsupported_format" }, { status: 400 });

  const extension = EXTENSIONS[parsed.data.contentType.split(";")[0]!];
  // The prefix comes from the token's owner, never from the request, so a
  // handoff cannot be steered into somebody else's folder.
  const path = `${userId}/twin-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await createServiceClient()
    .storage.from("uploads")
    .createSignedUploadUrl(path);
  if (error || !data) {
    logger.error("could not ticket a handoff upload", { error: error?.message ?? "no data" });
    return NextResponse.json({ error: "upload_unavailable" }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
});

export const PUT = withTrace("PUT /api/avatar/handoff", async (request) => {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const token = tokenFrom(request);
  if (!looksLikeHandoffToken(token)) {
    return NextResponse.json({ error: "invalid_link" }, { status: 404 });
  }

  const parsed = claimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  /*
   * Claiming is the same statement that checks the link is live, so two phones
   * racing one QR cannot both win: the second update matches no rows.
   */
  const { data, error } = await createServiceClient().rpc("claim_avatar_handoff", {
    p_token_hash: hashHandoffToken(token),
    p_path: parsed.data.path,
  });
  if (error) {
    logger.error("could not claim an avatar handoff", { error: error.message });
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
  const claimed = (data as { user_id: string }[] | null)?.[0]?.user_id ?? null;
  if (!claimed) return NextResponse.json({ error: "invalid_link" }, { status: 409 });

  logger.info("avatar handoff claimed", { userId: claimed });
  return NextResponse.json({ ok: true });
});
