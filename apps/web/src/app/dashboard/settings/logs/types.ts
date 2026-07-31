import { z } from "zod";

/**
 * The shape of an activity log entry, and the filters that select it.
 *
 * Four tables feed this page and none of them share a schema, so each row is
 * normalised into this one shape at the point it is read. The alternative, a
 * SQL view unioning them, would be faster and is the right answer eventually,
 * but it needs a migration this task does not own.
 */

export const LOG_KINDS = ["generation", "publish", "ai", "api_key"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const LOG_KIND_LABELS: Readonly<Record<LogKind, string>> = {
  generation: "Videos",
  publish: "Posts",
  ai: "AI calls",
  api_key: "API keys",
};

/** Three outcomes, because that is all a reader needs to triage a list. */
export type LogStatus = "ok" | "pending" | "failed";

export interface LogEntry {
  /** Unique across sources: the source table's id is only unique within it. */
  readonly id: string;
  readonly kind: LogKind;
  /** ISO 8601, UTC. Formatted in the reader's zone at render time. */
  readonly at: string;
  readonly title: string;
  readonly status: LogStatus;
  /** The failure message, when there is one. Never invented. */
  readonly detail: string | null;
  /** Short factual annotation, e.g. a model name or a platform. */
  readonly meta: string | null;
}

export const PAGE_SIZE = 25;

/**
 * How deep the list can be paged.
 *
 * Merging four independently sorted sources means reading `offset + limit` rows
 * from each one to answer any page, so an unbounded offset turns a page request
 * into four unbounded scans. Twenty pages is far more than anyone reads, and it
 * keeps the worst case at 500 rows per source.
 */
export const MAX_PAGE = 20;

export const logFilterSchema = z.object({
  kind: z.enum(LOG_KINDS).optional(),
  /** A single calendar day in the reader's timezone, `YYYY-MM-DD`. */
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1).default(1),
});

export type LogFilter = z.output<typeof logFilterSchema>;

export interface LogPage {
  readonly entries: readonly LogEntry[];
  readonly hasMore: boolean;
  readonly page: number;
}
