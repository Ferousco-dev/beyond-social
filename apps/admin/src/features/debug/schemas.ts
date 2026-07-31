import { z } from "zod";

/**
 * Wire shapes of the `admin_*` functions in migration 0035.
 *
 * The console's hand-written database type covers auth only, so these schemas
 * are the actual contract with the database rather than a formality. Nothing
 * reaches a component without passing through here.
 */

const traceKind = z.enum(["generation", "publish"]);

export const traceTimelineSchema = z.object({
  observed_at: z.coerce.date(),
  records: z.coerce.number(),
  items: z.array(
    z.object({
      kind: traceKind,
      id: z.string().uuid(),
      user_id: z.string().uuid().nullable(),
      status: z.string(),
      detail: z.string(),
      error: z.string().nullable(),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
    }),
  ),
});

export const failureDetailsSchema = z.object({
  observed_at: z.coerce.date(),
  matched: z.coerce.number(),
  items: z.array(
    z.object({
      kind: z.enum(["generation", "publish", "ai"]),
      // ai_usage has a bigserial primary key, so this is not a uuid everywhere.
      id: z.string(),
      user_id: z.string().uuid().nullable(),
      detail: z.string(),
      error: z.string(),
      correlation: z.string().nullable(),
      failed_at: z.coerce.date(),
    }),
  ),
});

export const stuckWorkSchema = z.object({
  observed_at: z.coerce.date(),
  generating_stuck: z.coerce.number(),
  publish_incomplete: z.coerce.number(),
  items: z.array(
    z.object({
      kind: traceKind,
      id: z.string().uuid(),
      user_id: z.string().uuid().nullable(),
      status: z.string(),
      detail: z.string(),
      correlation: z.string().nullable(),
      since: z.coerce.date(),
      already_posted: z.boolean(),
      retryable: z.boolean(),
    }),
  ),
});

export const retryPostSchema = z.object({
  id: z.string().uuid(),
  requeued_at: z.coerce.date(),
  may_have_posted: z.boolean(),
});
