import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { HealthView } from "@/features/health/health-view";
import { HEALTH_THRESHOLDS } from "@/lib/health/config";

export const metadata: Metadata = { title: "Health" };

/**
 * Never cached. A monitoring page that can be served from a cache is a page
 * that can report an outage as all clear.
 */
export const dynamic = "force-dynamic";

export default function HealthPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Health"
        description={`Work that is stuck, work that failed, and the state of the caches and rate limiters. Failure panels cover the last ${HEALTH_THRESHOLDS.windowHours} hours.`}
      />
      <HealthView />
    </>
  );
}
