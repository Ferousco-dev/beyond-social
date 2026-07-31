import "server-only";

import { type createClient } from "@/lib/supabase/server";

import { type DayRange } from "./day-range";
import { type LogEntry, type LogStatus } from "./types";

/**
 * One reader per source table. Each returns entries already sorted newest
 * first, which is what lets the merge in `queries.ts` be a simple sorted merge.
 *
 * Every reader relies on RLS for scoping. None of them filters by user id, and
 * none of them should: adding an explicit `.eq("user_id", ...)` would make the
 * policy look optional to the next person reading this, and the policy is the
 * thing that is actually load-bearing.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

export type SourceReader = (
  supabase: Client,
  range: DayRange | null,
  take: number,
) => Promise<LogEntry[]>;

/** Applies the day filter, when there is one. */
function windowed<T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(
  query: T,
  column: string,
  range: DayRange | null,
): T {
  if (!range) return query;
  return query.gte(column, range.from).lt(column, range.to);
}

export const readGenerations: SourceReader = async (supabase, range, take) => {
  const { data } = await windowed(
    supabase
      .from("video_generations")
      .select("id, model, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
    "created_at",
    range,
  );

  return (data ?? []).map((row) => {
    const status: LogStatus =
      row.status === "ready" ? "ok" : row.status === "failed" ? "failed" : "pending";
    return {
      id: `generation:${row.id}`,
      kind: "generation" as const,
      at: row.created_at,
      title:
        status === "ok"
          ? "Video generated"
          : status === "failed"
            ? "Video generation failed"
            : "Video generating",
      status,
      detail: row.error,
      meta: row.model,
    };
  });
};

export const readPublishes: SourceReader = async (supabase, range, take) => {
  const { data } = await windowed(
    supabase
      .from("scheduled_posts")
      .select("id, platform, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
    "created_at",
    range,
  );

  return (data ?? []).map((row) => {
    const status: LogStatus =
      row.status === "published" ? "ok" : row.status === "failed" ? "failed" : "pending";
    return {
      id: `publish:${row.id}`,
      kind: "publish" as const,
      at: row.created_at,
      title:
        status === "ok"
          ? "Post published"
          : status === "failed"
            ? "Post failed to publish"
            : "Post waiting to publish",
      status,
      detail: row.error,
      meta: row.platform,
    };
  });
};

export const readAiCalls: SourceReader = async (supabase, range, take) => {
  const { data } = await windowed(
    supabase
      .from("ai_usage")
      .select("id, task, model, ok, error, latency_ms, cached, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
    "created_at",
    range,
  );

  return (data ?? []).map((row) => ({
    id: `ai:${row.id}`,
    kind: "ai" as const,
    at: row.created_at,
    title: row.ok ? `AI call: ${row.task}` : `AI call failed: ${row.task}`,
    status: row.ok ? ("ok" as const) : ("failed" as const),
    detail: row.error,
    meta: [row.model, row.cached ? "cached" : null, `${row.latency_ms}ms`]
      .filter((part): part is string => part !== null)
      .join(" · "),
  }));
};

/**
 * API key lifecycle, not individual calls.
 *
 * `api_keys` records `created_at`, `last_used_at` and `revoked_at` and nothing
 * else. There is no per-request table, so a log of individual key-authenticated
 * calls cannot be built from what exists, and inventing one is not an option.
 * What is real is when a key was made, when it was last used, and when it was
 * revoked, so that is what this shows. Requests made with a key that hit the AI
 * do appear, under "AI calls".
 */
export const readApiKeyEvents: SourceReader = async (supabase, range, take) => {
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(take);

  const entries: LogEntry[] = [];
  for (const row of data ?? []) {
    const push = (suffix: string, at: string | null, title: string) => {
      if (!at) return;
      if (range && (at < range.from || at >= range.to)) return;
      entries.push({
        id: `api_key:${row.id}:${suffix}`,
        kind: "api_key",
        at,
        title,
        status: "ok",
        detail: null,
        meta: row.name,
      });
    };

    push("created", row.created_at, "API key created");
    push("used", row.last_used_at, "API key last used");
    push("revoked", row.revoked_at, "API key revoked");
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
};
