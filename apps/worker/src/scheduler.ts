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
      await queue.add("publish", {
        scheduledPostId: post.id,
        userId: post.user_id,
        platform: post.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        generationId: post.generation_id,
      });
    }
    if (posts.length > 0) logger.info("enqueued due posts", { count: posts.length });
  };

  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  void scan();

  return () => clearInterval(timer);
}
