import { type Metadata } from "next";

import { getStuckWork } from "@/lib/dashboard/admin";
import { TraceLookup } from "@/features/admin/components/trace-lookup";
import { FailureExplorer } from "@/features/admin/components/failure-explorer";
import { StuckWorkList } from "@/features/admin/components/stuck-work-list";

export const metadata: Metadata = { title: "Admin · Debug" };

export default async function AdminDebugPage() {
  const stuckWork = await getStuckWork(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Debug console</h1>
      <p className="mt-1 text-sm text-ink-soft">Trace one record, inspect failures in full, retry stuck work.</p>

      <section className="mt-6 rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Trace lookup</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Every record sharing one trace id, oldest first, across generation and publish.
        </p>
        <div className="mt-3">
          <TraceLookup />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Failure explorer</h2>
        <p className="mt-1 text-xs text-ink-soft">Untruncated errors, filterable by kind and window.</p>
        <div className="mt-3">
          <FailureExplorer />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Stuck work</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Wider than the Health board: also catches a post a dying worker may have already sent.
        </p>
        <div className="mt-3">
          <StuckWorkList items={stuckWork?.items ?? []} />
        </div>
      </section>
    </div>
  );
}
