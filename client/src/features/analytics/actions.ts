"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { postMetricsResponse, recentMetricsResponse } from "@/lib/go-api/schemas";
import type { PostMetrics } from "@/lib/go-api/schemas";

export type MetricsPoint = { readonly collectedAt: string; readonly views: number; readonly likes: number; readonly comments: number };

export type MetricsResult =
  | { readonly status: "ok"; readonly latest: PostMetrics | null; readonly history: readonly MetricsPoint[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/** Latest snapshot plus history depth for one post. */
export async function getPostMetrics(postId: string): Promise<MetricsResult> {
  if (!z.string().uuid().safeParse(postId).success) return { status: "error", message: "That post could not be found." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/posts/${postId}/metrics`, postMetricsResponse);
  if (!result.ok) return { status: "error", message: result.message };
  return {
    status: "ok",
    latest: result.data.data.latest,
    history: result.data.data.history.map((point) => ({
      collectedAt: point.collected_at,
      views: point.views,
      likes: point.likes,
      comments: point.comments,
    })),
  };
}

/** Metrics for the newest published posts in one request; null when the API has no batch endpoint yet. */
export async function getRecentMetrics(limit: number): Promise<ReadonlyMap<string, MetricsResult> | null> {
  if (!isGoApiConfigured()) return null;
  const result = await goApi(`/api/v1/post-metrics?limit=${Math.min(50, Math.max(1, Math.trunc(limit)))}`, recentMetricsResponse);
  if (!result.ok) return null;
  return new Map(
    Object.entries(result.data.data).map(([id, value]): [string, MetricsResult] => [
      id,
      {
        status: "ok",
        latest: value.latest,
        history: value.history.map((point) => ({ collectedAt: point.collected_at, views: point.views, likes: point.likes, comments: point.comments })),
      },
    ]),
  );
}

