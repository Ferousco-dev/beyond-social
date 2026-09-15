import { type Metadata } from "next";

import {
  getAiFailures,
  getCacheHealth,
  getFailureFeed,
  getRateLimitPressure,
  getStuckPipeline,
} from "@/lib/dashboard/admin";
import { HealthSection } from "@/features/admin/components/health-section";
import { StuckList } from "@/features/admin/components/stuck-list";
import { FailureList } from "@/features/admin/components/failure-list";
import { AiFailureList } from "@/features/admin/components/ai-failure-list";
import { RateLimitList } from "@/features/admin/components/rate-limit-list";
import { CacheHealthCard } from "@/features/admin/components/cache-health-card";

export const metadata: Metadata = { title: "Admin · Health" };

export default async function AdminHealthPage() {
  const [stuck, failures, aiFailures, rateLimits, cache] = await Promise.all([
    getStuckPipeline(20),
    getFailureFeed(24, 20),
    getAiFailures(24, 20),
    getRateLimitPressure(20),
    getCacheHealth(24),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Health</h1>
      <p className="mt-1 text-sm text-ink-soft">What is broken right now.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <HealthSection
          title="Stuck pipeline"
          count={stuck ? stuck.generatingStuck + stuck.publishingStuck : null}
          observedAt={stuck?.observedAt ?? null}
        >
          <StuckList items={stuck?.items ?? []} />
        </HealthSection>

        <HealthSection
          title="Failures (24h)"
          count={failures ? failures.failedGenerations + failures.failedPosts : null}
          observedAt={failures?.observedAt ?? null}
        >
          <FailureList items={failures?.items ?? []} />
        </HealthSection>

        <HealthSection
          title="AI failures (24h)"
          count={aiFailures?.failures ?? null}
          observedAt={aiFailures?.observedAt ?? null}
        >
          <AiFailureList providers={aiFailures?.providers ?? []} />
        </HealthSection>

        <HealthSection
          title="Rate limit pressure"
          count={rateLimits?.activeKeys ?? null}
          observedAt={rateLimits?.observedAt ?? null}
          countLabel="active keys"
          neutral
        >
          <RateLimitList scopes={rateLimits?.scopes ?? []} />
        </HealthSection>
      </div>

      <div className="mt-4">
        <CacheHealthCard cache={cache} />
      </div>
    </div>
  );
}
