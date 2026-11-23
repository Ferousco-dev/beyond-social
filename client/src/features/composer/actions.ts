"use server";

import { z } from "zod";

import { formatPrice } from "@/features/billing/format";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { creditsResponse, jobResponse, plansResponse } from "@/lib/go-api/schemas";

const id = z.string().uuid();

const suggestSchema = z.object({
  mode: z.enum(["edit", "create"]),
  prompt: z.string().trim().min(1).max(2000),
  pictureIds: z.array(id).max(4),
  videoId: id.optional(),
});

export type Suggestion = { readonly ok: true; readonly prompt: string } | { readonly ok: false; readonly message: string };

/** Asks Gemini for a clearer version of the prompt. Free for the person, capped per hour by the server. */
export async function suggestPrompt(input: z.input<typeof suggestSchema>): Promise<Suggestion> {
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Describe the video in up to 2,000 characters." };
  if (!isGoApiConfigured()) return { ok: false, message: "Suggestions are not available right now." };
  const { mode, prompt, pictureIds, videoId } = parsed.data;
  const result = await goApi("/api/v1/compose/rewrite", z.object({ data: z.object({ prompt: z.string() }) }), {
    method: "POST",
    body: { mode, prompt, picture_media_ids: pictureIds, ...(videoId ? { video_media_id: videoId } : {}) },
    timeoutMs: 60_000,
  });
  if (result.ok) return { ok: true, prompt: result.data.data.prompt };
  // A server without the composer yet answers 404 with a routing message, which means nothing to a person.
  return { ok: false, message: result.status === 404 && /no such route/i.test(result.message) ?"Suggestions are not available right now." : result.message };
}

export type EditQuote = { readonly ok: true; readonly credits: number; readonly seconds: number } | { readonly ok: false; readonly message: string };

/** The credits an edit costs, priced by the server from the video's own length. */
export async function quoteEdit(videoId: string): Promise<EditQuote> {
  if (!id.safeParse(videoId).success) return { ok: false, message: "Attach the video again." };
  const result = await goApi(
    `/api/v1/compose/edit/quote?video_media_id=${encodeURIComponent(videoId)}`,
    z.object({ data: z.object({ credits: z.number().int(), seconds: z.number().int() }) }),
  );
  return result.ok ? { ok: true, ...result.data.data } : { ok: false, message: result.message };
}

const editSchema = z.object({
  videoId: id,
  pictureIds: z.array(id).max(4),
  prompt: z.string().trim().min(1).max(3000),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  key: z.string().min(8).max(64),
});

export type EditStart = { readonly ok: true; readonly jobId: string } | { readonly ok: false; readonly message: string; readonly code?: string };

/** Starts editing the person's video. This spends credits, so it only runs after they confirm. */
export async function startEdit(input: z.input<typeof editSchema>): Promise<EditStart> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Describe the change in a sentence or two." };
  const { videoId, pictureIds, prompt, aspectRatio, key } = parsed.data;
  const result = await goApi("/api/v1/compose/edit", jobResponse, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: { video_media_id: videoId, picture_media_ids: pictureIds, prompt, aspect_ratio: aspectRatio },
  });
  return result.ok ? { ok: true, jobId: result.data.data.id } : { ok: false, message: result.message, code: result.code };
}

export interface Wallet {
  readonly balance: number | null;
  /** The Pro price, shown only to a Free member. */
  readonly proPrice: string | null;
}

/** The balance and, for a Free member, the Pro price: read when the cost is shown, not on page load. */
export async function wallet(): Promise<Wallet> {
  const [credits, user, plans] = await Promise.all([
    goApi("/api/v1/credits", creditsResponse),
    getCurrentUser(),
    goApi("/api/v1/plans", plansResponse, { anonymous: true }),
  ]);
  return {
    balance: credits.ok ? credits.data.data.balance : null,
    proPrice: user.plan === "free" && plans.ok ? formatPrice(plans.data.data.pro_price_cents, "usd") : null,
  };
}
