"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";

const briefSchema = z.object({
  title: z.string(),
  objective: z.string(),
  purpose: z.string(),
  audience: z.object({ gender: z.enum(["any", "female", "male"]), ages: z.array(z.string()), interests: z.array(z.string()) }),
  product: z.string(),
  language: z.string(),
  platform: z.string(),
  seconds: z.number().int(),
  visual_style: z.string(),
  environment: z.string(),
  content_kind: z.string(),
  hook: z.string(),
  scenes: z.string(),
  dialogue: z.string(),
  tone: z.string(),
  cta: z.string(),
  speaker_mode: z.enum(["single", "conversation"]),
  face_asset_id: z.string(),
  voice_asset_id: z.string(),
  product_asset_id: z.string(),
  environment_asset_id: z.string(),
});
export type Brief = z.infer<typeof briefSchema>;

export type AutofillResult = { readonly ok: true; readonly brief: Brief } | { readonly ok: false; readonly message: string };

/** Asks our AI to fill the whole form from a sentence or two. Free, capped per hour by the server. */
export async function autofillVideo(idea: string): Promise<AutofillResult> {
  const text = idea.trim();
  if (text === "" || text.length > 2000) return { ok: false, message: "Describe your video in a sentence or two." };
  if (!isGoApiConfigured()) return { ok: false, message: "This is not available right now. Fill it in yourself." };
  const result = await goApi("/api/v1/compose/brief", z.object({ data: briefSchema }), { method: "POST", body: { idea: text }, timeoutMs: 60_000 });
  if (result.ok) return { ok: true, brief: result.data.data };
  return { ok: false, message: result.status === 404 ? "This is not available right now. Fill it in yourself." : result.message };
}
