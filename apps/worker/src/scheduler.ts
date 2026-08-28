import { createServiceClient } from "./lib/supabase";
import { logger } from "./lib/logger";
import { type PublishQueue } from "./queues/publishing";
import { type RenderQueue } from "./queues/rendering";

const SCAN_INTERVAL_MS = 30_000;
const CLAIM_BATCH = 20;

interface DuePost {
  id: string;
  user_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  generation_id: string | null;
}

// Periodically claims due scheduled posts (atomically, via `claim_due_posts`)
// and enqueues a publish job for each. Safe to run on many workers at once.
export function startScheduler(queue: PublishQueue): () => void {
  const supabase = createServiceClient();

  const scan = async (): Promise<void> => {
    const { data, error } = await supabase.rpc("claim_due_posts", { p_limit: CLAIM_BATCH });
    if (error) {
      logger.error("failed to claim due posts", { error: error.message });
      return;
    }
    const posts = (data ?? []) as DuePost[];
    for (const post of posts) {
      try {
        await queue.add(
          "publish",
          {
            scheduledPostId: post.id,
            userId: post.user_id,
            platform: post.platform,
            caption: post.caption,
            hashtags: post.hashtags,
            generationId: post.generation_id,
          },
          // A hyphen, not a colon: BullMQ namespaces its own Redis keys with
          // colons and rejects a custom id containing one. This threw on the
          // first due post, and only ever on the first due post, so it survived
          // until something was actually scheduled.
          //
          // The post's own id is the job id, so the same post can never be in the
          // queue twice. Two schedulers scanning at once, or one scan retried
          // after a partial failure, both produce the same id and BullMQ keeps
          // one. Without this the claim in the database is the only thing standing
          // between a retry and a duplicate post; with it, the duplicate never
          // reaches the queue.
          { jobId: `post-${post.id}` },
        );
      } catch (error) {
        // The claim above already moved this row out of `scheduled`, so a
        // failed `queue.add` (a Redis blip, a shutdown mid-scan) strands it:
        // no future scan will ever select it again, and nothing is processing
        // it either. Reverting the claim is what makes the retry the comment
        // above describes actually happen, instead of only being true in
        // theory.
        logger.error("failed to enqueue a claimed post, reverting for a later scan", {
          scheduledPostId: post.id,
          error: error instanceof Error ? error.message : String(error),
        });
        const { error: revertError } = await supabase
          .from("scheduled_posts")
          .update({ status: "scheduled" })
          .eq("id", post.id);
        if (revertError) {
          logger.error("could not revert a stranded scheduled post back to scheduled", {
            scheduledPostId: post.id,
            error: revertError.message,
          });
        }
      }
    }
    if (posts.length > 0) logger.info("enqueued due posts", { count: posts.length });
  };

  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  void scan();

  return () => clearInterval(timer);
}

interface QueuedRender {
  id: string;
  user_id: string;
  clip_paths: string[];
  /** The cut: trims and levels, in order. Null joins `clip_paths` whole. */
  spec: unknown;
}

/**
 * Claims queued renders and enqueues one job each.
 *
 * The same shape as the publish scan above, and for the same reasons: the
 * claim is atomic in the database so several workers can scan at once, and the
 * row's own id is the job id so a scan retried after a partial failure cannot
 * put the same render in the queue twice.
 *
 * Scanned more often than posts. A scheduled post is due at a time the user
 * picked minutes or hours ahead, where an export is something they are sitting
 * and waiting for, so half a minute of latency before it even starts is felt.
 */
const RENDER_SCAN_INTERVAL_MS = 5_000;
const RENDER_CLAIM_BATCH = 5;

export function startRenderScheduler(queue: RenderQueue): () => void {
  const supabase = createServiceClient();

  const scan = async (): Promise<void> => {
    const { data, error } = await supabase.rpc("claim_queued_renders", {
      p_limit: RENDER_CLAIM_BATCH,
    });
    if (error) {
      logger.error("failed to claim queued renders", { error: error.message });
      return;
    }

    const renders = (data ?? []) as QueuedRender[];
    for (const render of renders) {
      try {
        await queue.add(
          "render",
          {
            renderId: render.id,
            userId: render.user_id,
            clipPaths: render.clip_paths,
            spec: render.spec,
          },
          { jobId: `render-${render.id}` },
        );
      } catch (error) {
        // Same reasoning as the publish scan above: the claim already moved
        // this row out of `queued`, so a failed enqueue strands it for good
        // unless the claim is reverted here.
        logger.error("failed to enqueue a claimed render, reverting for a later scan", {
          renderId: render.id,
          error: error instanceof Error ? error.message : String(error),
        });
        const { error: revertError } = await supabase
          .from("project_renders")
          .update({ status: "queued" })
          .eq("id", render.id);
        if (revertError) {
          logger.error("could not revert a stranded render back to queued", {
            renderId: render.id,
            error: revertError.message,
          });
        }
      }
    }
    if (renders.length > 0) logger.info("enqueued renders", { count: renders.length });
  };

  const timer = setInterval(() => void scan(), RENDER_SCAN_INTERVAL_MS);
  void scan();

  return () => clearInterval(timer);
}
