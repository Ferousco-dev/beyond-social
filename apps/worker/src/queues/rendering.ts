import { Queue } from "bullmq";

import { createRedis } from "../lib/redis";

export const RENDER_QUEUE = "render-video";

export interface RenderJobData {
  /** The row this job reports into, so the app can watch it. */
  renderId: string;
  /** Whose objects these are. Every path is checked against this prefix. */
  userId: string;
  /**
   * Ordered source clips, as object paths in the `renders` bucket. Order is the
   * cut: this is the one thing about the job the user actually authored.
   */
  clipPaths: string[];
  /**
   * The cut itself: trims and levels, in order. `unknown` because this is
   * `jsonb` off the claim RPC, unvalidated until the processor parses it;
   * null means join `clipPaths` whole, which is also what an unparseable value
   * falls back to.
   */
  spec: unknown;
}

export function createRenderQueue() {
  return new Queue<RenderJobData>(RENDER_QUEUE, {
    connection: createRedis(),
    defaultJobOptions: {
      /*
       * Fewer attempts than publishing. A publish fails for transient reasons
       * worth retrying five times; a render fails because a clip is missing or
       * unreadable, which retrying does not fix. Two covers a dropped download.
       */
      attempts: 2,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

export type RenderQueue = ReturnType<typeof createRenderQueue>;
