"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { postMetricsResponse, slotsResponse } from "@/lib/go-api/schemas";
import type { InsightSlot, PostMetrics } from "@/lib/go-api/schemas";

export type MetricsResult =
  | { readonly status: "ok"; readonly latest: PostMetrics | null; readonly points: number }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/** Latest snapshot plus history depth for one post. */
export async function getPostMetrics(postId: string): Promise<MetricsResult> {
  if (!z.string().uuid().safeParse(postId).success) return { status: "error", message: "Unknown post." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/posts/${postId}/metrics`, postMetricsResponse);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", latest: result.data.data.latest, points: result.data.data.history.length };
}

export type SlotsResult =
  | { readonly status: "ok"; readonly slots: readonly InsightSlot[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

const platformSchema = z.enum(["youtube", "tiktok", "instagram"]);

/** Posting times learned from the account's own history. Empty is normal early. */
export async function getInsightSlots(platform: string): Promise<SlotsResult> {
  const parsed = platformSchema.safeParse(platform);
  if (!parsed.success) return { status: "error", message: "Unknown platform." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/insights/slots?platform=${parsed.data}`, slotsResponse);
  return result.ok ? { status: "ok", slots: result.data.data.slots } : { status: "error", message: result.message };
}
