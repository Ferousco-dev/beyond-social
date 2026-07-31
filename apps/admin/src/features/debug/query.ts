import { z } from "zod";

import { todayUtc } from "./config";

/**
 * The debugging console's state lives in the query string, so a view of one
 * incident can be pasted into a ticket and reopened by someone else exactly as
 * the first person saw it. Everything below is parsed at that boundary.
 */

export const FAILURE_KINDS = ["all", "generation", "publish", "ai"] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

export const FAILURE_KIND_LABEL: Record<FailureKind, string> = {
  all: "Everything",
  generation: "Generations",
  publish: "Publishes",
  ai: "AI calls",
};

export const debugQuerySchema = z.object({
  /**
   * Trace ids are W3C hex in practice, but the column is text and a support
   * report may quote something else, so the shape is constrained rather than
   * assumed: printable, bounded, and free of anything that is not an id.
   */
  trace: z
    .string()
    .trim()
    .max(128)
    .regex(/^[A-Za-z0-9._:-]*$/)
    .catch(""),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()))
    .catch(() => todayUtc()),
  kind: z.enum(FAILURE_KINDS).catch("all"),
});

export type DebugQuery = z.infer<typeof debugQuerySchema>;

export function debugHref(query: DebugQuery): string {
  const params = new URLSearchParams();
  if (query.trace) params.set("trace", query.trace);
  if (query.day !== todayUtc()) params.set("day", query.day);
  if (query.kind !== "all") params.set("kind", query.kind);
  const search = params.toString();
  return search ? `/debug?${search}` : "/debug";
}
