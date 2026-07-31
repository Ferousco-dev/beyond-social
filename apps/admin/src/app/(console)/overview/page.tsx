import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { OverviewView, OVERVIEW_WINDOW_DAYS } from "@/features/overview/overview-view";

export const metadata: Metadata = { title: "Overview" };

/** Read on every request. A cached total is a total that is quietly wrong. */
export const dynamic = "force-dynamic";

export default function OverviewPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Overview"
        description={`How big the platform is, what it did over the last ${OVERVIEW_WINDOW_DAYS} days, and what that cost. Every figure comes from an admin only function in the database.`}
      />
      <OverviewView />
    </>
  );
}
