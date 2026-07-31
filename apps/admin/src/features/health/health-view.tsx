import {
  getAiFailures,
  getCacheHealth,
  getFailureFeed,
  getRateLimitPressure,
  getStuckPipeline,
} from "@/lib/health/queries";

import { AiFailuresPanel } from "./components/ai-failures-panel";
import { CachePanel } from "./components/cache-panel";
import { FailureFeedPanel } from "./components/failure-feed-panel";
import { RateLimitPanel } from "./components/rate-limit-panel";
import { StuckPipelinePanel } from "./components/stuck-pipeline-panel";

/**
 * The health console: read-only, one panel per signal.
 *
 * The five reads run in parallel and each panel prints its own observation
 * time, so a slow or failing query degrades that panel alone instead of
 * silently ageing the whole page behind one timestamp.
 */
export async function HealthView() {
  const [stuck, failures, ai, rateLimits, cache] = await Promise.all([
    getStuckPipeline(),
    getFailureFeed(),
    getAiFailures(),
    getRateLimitPressure(),
    getCacheHealth(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StuckPipelinePanel data={stuck} />
      <FailureFeedPanel data={failures} />
      <AiFailuresPanel data={ai} />
      <RateLimitPanel data={rateLimits} />
      <CachePanel data={cache} />
    </div>
  );
}
