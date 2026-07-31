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
        // The post's own id is the job id, so the same post can never be in the
        // queue twice. Two schedulers scanning at once, or one scan retried
        // after a partial failure, both produce the same id and BullMQ keeps
        // one. Without this the claim in the database is the only thing standing
        // between a retry and a duplicate post; with it, the duplicate never
        // reaches the queue.
        { jobId: `post:${post.id}` },
      );
    }
    if (posts.length > 0) logger.info("enqueued due posts", { count: posts.length });
  };

  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  void scan();

  return () => clearInterval(timer);
}
