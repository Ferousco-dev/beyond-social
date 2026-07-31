import { z } from "zod";

/**
 * Wire shapes of the `admin_health_*` functions in migration 0030.
 *
 * Nothing reaches a component without passing through here: the RPC layer is
 * untyped until the generated database types are regenerated, so these schemas
 * are the actual contract with the database, not a formality.
 */

const kind = z.enum(["generation", "publish"]);

export const stuckPipelineSchema = z.object({
  observed_at: z.coerce.date(),
  generating_stuck: z.coerce.number(),
  publishing_stuck: z.coerce.number(),
  items: z.array(
    z.object({
      kind,
      id: z.string().uuid(),
      detail: z.string(),
      since: z.coerce.date(),
    }),
  ),
});

export const failureFeedSchema = z.object({
  observed_at: z.coerce.date(),
  failed_generations: z.coerce.number(),
  failed_posts: z.coerce.number(),
  items: z.array(
    z.object({
      kind,
      id: z.string().uuid(),
      detail: z.string(),
      error: z.string(),
      failed_at: z.coerce.date(),
    }),
  ),
});

export const aiFailuresSchema = z.object({
  observed_at: z.coerce.date(),
  calls: z.coerce.number(),
  failures: z.coerce.number(),
  providers: z.array(
    z.object({
      provider: z.string(),
      model: z.string(),
      calls: z.coerce.number(),
      failures: z.coerce.number(),
      last_error: z.string(),
      last_failed_at: z.coerce.date().nullable(),
    }),
  ),
});

export const rateLimitPressureSchema = z.object({
  observed_at: z.coerce.date(),
  active_keys: z.coerce.number(),
  scopes: z.array(
    z.object({
      scope: z.string(),
      keys: z.coerce.number(),
      peak_count: z.coerce.number(),
      total_count: z.coerce.number(),
      window_ends_at: z.coerce.date(),
    }),
  ),
});

export const cacheHealthSchema = z.object({
  observed_at: z.coerce.date(),
  live_entries: z.coerce.number(),
  expired_entries: z.coerce.number(),
  newest_entry_at: z.coerce.date().nullable(),
  embedding_entries: z.coerce.number(),
  ai_calls: z.coerce.number(),
  cached_calls: z.coerce.number(),
});
