import { Metric, MetricRow } from "@/components/ui/metric";
import { formatCount } from "@/lib/format";
import { HEALTH_THRESHOLDS } from "@/lib/health/config";
import { formatAge, formatRate, rate } from "@/lib/health/format";
import type { CacheHealth } from "@/lib/health/types";

import { Panel } from "./panel";

export function CachePanel({ data }: { data: CacheHealth | null }) {
  const hitRate = data ? rate(data.cachedCalls, data.aiCalls) : null;

  return (
    <Panel
      title="Cache"
      hint={`Cache occupancy now, and calls served from cache over the last ${HEALTH_THRESHOLDS.windowHours}h`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric label="Calls served from cache" value={formatRate(hitRate)} />
            <Metric
              label="Cached calls"
              value={`${formatCount(data.cachedCalls)} of ${formatCount(data.aiCalls)}`}
            />
            <Metric label="Live response entries" value={formatCount(data.liveEntries)} />
            <Metric
              label="Expired, not swept"
              value={formatCount(data.expiredEntries)}
              tone={data.expiredEntries > 0 ? "warning" : "neutral"}
            />
            <Metric label="Embedding entries" value={formatCount(data.embeddingEntries)} />
          </MetricRow>

          <p className="text-xs text-ink-soft">
            The rate is the share of recorded AI calls that were answered from cache, which
            is the only hit rate the schema records. <code className="font-mono">response_cache</code>{" "}
            counts no hits, so a per-table hit rate would be invented rather than measured.
            {data.newestEntryAt
              ? ` Newest cache entry written ${formatAge(data.newestEntryAt, data.observedAt)} ago.`
              : " The response cache is empty."}
          </p>
        </>
      ) : null}
    </Panel>
  );
}
