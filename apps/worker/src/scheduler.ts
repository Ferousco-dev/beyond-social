import { createServiceClient } from "./lib/supabase";
import { logger } from "./lib/logger";
import { type PublishQueue } from "./queues/publishing";

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
