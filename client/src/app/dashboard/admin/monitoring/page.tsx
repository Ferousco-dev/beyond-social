import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";
import { z } from "zod";

import { ResolveAlertButton } from "@/features/admin-console/components/resolve-alert-button";
import { MonitoringChecks } from "@/features/admin-console/components/monitoring-checks";
import { alertsResponse, monitoringSnapshotResponse, usageResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Monitoring" };

const apiHealthResponse = z.object({ status: z.literal("ok") });
const apiReadyResponse = z.object({
  status: z.enum(["ready", "unavailable"]),
  version: z.string(),
  checks: z.object({ database: z.enum(["ok", "unavailable"]) }),
});

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function dateTime(value?: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "None";
}

export default async function AdminMonitoringPage(): Promise<ReactNode> {
  const [alerts, snapshot, usage, apiHealth, apiReady] = await Promise.all([
    goApi("/api/v1/admin/alerts?open=true", alertsResponse),
    goApi("/api/v1/admin/monitoring", monitoringSnapshotResponse),
    goApi("/api/v1/admin/credits/usage?days=7", usageResponse),
    goApi("/health", apiHealthResponse, { anonymous: true }),
    goApi("/ready", apiReadyResponse, { anonymous: true }),
  ]);
  const estimatedCost = usage.ok ? usage.data.data.actions.reduce((sum, row) => sum + row.estimatedCostUsd, 0) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Monitoring</h1>
      <p className="mt-1 text-sm text-ink-soft">Current service checks and persisted workload state. Failure records cover the last 7 days.</p>

      <div className="mt-8">
        <MonitoringChecks />
      </div>

      <section className="mt-8" aria-labelledby="api-health-heading">
        <h2 id="api-health-heading" className="text-sm font-semibold text-ink">Go API</h2>
        <dl className="mt-3 grid divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-3 sm:px-4 sm:first:pl-0"><dt className="text-xs text-ink-soft">Process liveness</dt><dd className="mt-1 text-sm font-medium text-ink">{apiHealth.ok ? "Available" : "Unavailable"}</dd></div>
          <div className="py-3 sm:px-4"><dt className="text-xs text-ink-soft">Readiness</dt><dd className="mt-1 text-sm font-medium text-ink">{apiReady.ok ? apiReady.data.status === "ready" ? "Ready" : "Unavailable" : "Could not check"}</dd></div>
          <div className="py-3 sm:px-4 sm:last:pr-0"><dt className="text-xs text-ink-soft">Database</dt><dd className="mt-1 text-sm font-medium text-ink">{apiReady.ok ? apiReady.data.checks.database : "Could not check"}</dd></div>
        </dl>
      </section>

      {!snapshot.ok ? (
        <p role="alert" className="mt-8 text-sm text-destructive">{snapshot.message}</p>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="jobs-heading">
            <h2 id="jobs-heading" className="text-sm font-semibold text-ink">Generation jobs</h2>
            <dl className="mt-3 grid grid-cols-2 divide-x divide-y divide-hairline border-y border-hairline sm:grid-cols-5 sm:divide-y-0">
              {[["Queued", snapshot.data.data.jobs.queued], ["Running", snapshot.data.data.jobs.running], ["Completed", snapshot.data.data.jobs.completed], ["Failed", snapshot.data.data.jobs.failed], ["Ready", snapshot.data.data.jobs.ready]].map(([label, count]) => (
                <div key={label} className="py-3 pr-3 sm:px-3 sm:first:pl-0"><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{count}</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-ink-soft">Oldest queued: {dateTime(snapshot.data.data.jobs.oldestQueuedAt)} · oldest running: {dateTime(snapshot.data.data.jobs.oldestRunningAt)}</p>
          </section>

          <section className="mt-8" aria-labelledby="publishing-heading">
            <h2 id="publishing-heading" className="text-sm font-semibold text-ink">Social publishing</h2>
            <dl className="mt-3 grid grid-cols-2 divide-x divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
              {[["Preparing", snapshot.data.data.posts.preparing], ["Scheduled", snapshot.data.data.posts.scheduled], ["Publishing", snapshot.data.data.posts.publishing], ["Published", snapshot.data.data.posts.published], ["Failed", snapshot.data.data.posts.failed], ["Cancelled", snapshot.data.data.posts.cancelled]].map(([label, count]) => (
                <div key={label} className="py-3 pr-3 sm:px-3 sm:first:pl-0"><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{count}</dd></div>
              ))}
            </dl>
          </section>

          <section className="mt-8" aria-labelledby="storage-heading">
            <h2 id="storage-heading" className="text-sm font-semibold text-ink">Recorded media storage</h2>
            <p className="mt-2 text-sm text-ink">{snapshot.data.data.storage.mediaObjects.toLocaleString("en-US")} ready objects · {formatBytes(snapshot.data.data.storage.mediaBytes)}</p>
            <p className="mt-1 text-xs text-ink-soft">Database-recorded user media only; this does not include untracked bucket objects or avatar footage.</p>
          </section>

          <section className="mt-8" aria-labelledby="failures-heading">
            <h2 id="failures-heading" className="text-sm font-semibold text-ink">Recent failed tasks</h2>
            {snapshot.data.data.recentFailures.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No persisted generation or publishing failures in the last 7 days.</p>
            ) : (
              <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
                {snapshot.data.data.recentFailures.map((failure, index) => (
                  <li key={`${failure.source}-${failure.name}-${failure.at}-${index}`} className="py-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium capitalize text-ink">{failure.source} · {failure.name}</span><time className="text-xs text-ink-soft" dateTime={failure.at}>{dateTime(failure.at)}</time></div>
                    <p className="mt-1 break-words text-sm text-ink-soft">{failure.message || "No diagnostic message was persisted."}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="mt-8" aria-labelledby="costs-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="costs-heading" className="text-sm font-semibold text-ink">AI service costs</h2>
          <Link href="/dashboard/admin/pricing" className="text-sm text-primary underline underline-offset-4">Pricing and usage detail</Link>
        </div>
        {usage.ok ? (
          <>
            <p className="mt-2 text-sm text-ink">Estimated action costs, last 7 days: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(estimatedCost ?? 0)}</p>
            {usage.data.data.providers.length > 0 ? (
              <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
                {usage.data.data.providers.map((provider) => <li key={`${provider.provider}-${provider.unit}`} className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink">{provider.provider} observed balance decrease</span><span className="tabular-nums text-ink-soft">{provider.unit === "usd" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(provider.spent) : `${provider.spent} ${provider.unit}`}</span></li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-ink-soft">No provider balance snapshots in this period.</p>}
          </>
        ) : <p role="alert" className="mt-2 text-sm text-destructive">{usage.message}</p>}
      </section>

      <section className="mt-8" aria-labelledby="provider-alerts-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="provider-alerts-heading" className="text-sm font-semibold text-ink">Open provider alerts</h2>
          <Link href="/dashboard/admin/alerts" className="text-sm text-primary underline underline-offset-4">All alerts</Link>
        </div>
        {!alerts.ok ? (
          <p role="alert" className="mt-3 text-sm text-destructive">{alerts.message}</p>
        ) : alerts.data.data.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No open provider alerts.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
            {alerts.data.data.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{alert.provider} · {alert.kind === "quota" ? "out of credit" : "key problem"}</p>
                  <p className="mt-1 text-sm text-ink-soft">{alert.message} · seen {alert.count} {alert.count === 1 ? "time" : "times"}</p>
                </div>
                <ResolveAlertButton id={alert.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 border-t border-hairline pt-4 text-xs text-ink-soft">
        Live checks are point-in-time. Persistent uptime history, complete object-store usage, and centralized application logs are not collected; these figures cover persisted jobs, posts, and media only.
      </p>
    </div>
  );
}