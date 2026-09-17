import { type Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
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

function PanelSkeleton() {
  return (
    <section className="rounded-xl border border-hairline bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </section>
  );
}

function CacheSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

async function StuckSection() {
  const stuck = await getStuckPipeline(20);
  return (
    <HealthSection
      title="Stuck pipeline"
      count={stuck ? stuck.generatingStuck + stuck.publishingStuck : null}
      observedAt={stuck?.observedAt ?? null}
    >
      <StuckList items={stuck?.items ?? []} />
    </HealthSection>
  );
}

async function FailuresSection() {
  const failures = await getFailureFeed(24, 20);
  return (
    <HealthSection
      title="Failures (24h)"
      count={failures ? failures.failedGenerations + failures.failedPosts : null}
      observedAt={failures?.observedAt ?? null}
    >
      <FailureList items={failures?.items ?? []} />
    </HealthSection>
  );
}

async function AiFailuresSection() {
  const aiFailures = await getAiFailures(24, 20);
  return (
    <HealthSection
      title="AI failures (24h)"
      count={aiFailures?.failures ?? null}
      observedAt={aiFailures?.observedAt ?? null}
    >
      <AiFailureList providers={aiFailures?.providers ?? []} />
    </HealthSection>
  );
}

async function RateLimitSection() {
  const rateLimits = await getRateLimitPressure(20);
  return (
    <HealthSection
      title="Rate limit pressure"
      count={rateLimits?.activeKeys ?? null}
      observedAt={rateLimits?.observedAt ?? null}
      countLabel="active keys"
      neutral
    >
      <RateLimitList scopes={rateLimits?.scopes ?? []} />
    </HealthSection>
  );
}

async function CacheSection() {
  const cache = await getCacheHealth(24);
  return <CacheHealthCard cache={cache} />;
}

export default function AdminHealthPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Health</h1>
      <p className="mt-1 text-sm text-ink-soft">What is broken right now.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton />}>
          <StuckSection />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
          <FailuresSection />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
          <AiFailuresSection />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
          <RateLimitSection />
        </Suspense>
      </div>

      <div className="mt-4">
        <Suspense fallback={<CacheSkeleton />}>
          <CacheSection />
        </Suspense>
      </div>
    </div>
  );
}
