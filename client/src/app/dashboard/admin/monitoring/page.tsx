import { HardDrive } from "lucide-react";
import { type Metadata, type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";
import { z } from "zod";

import { AdminHeader, Panel } from "@/features/admin/components/admin-ui";
import { ColumnChart } from "@/features/admin/components/column-chart";
import { MonitoringChecks, type ServiceStatus } from "@/features/admin-console/components/monitoring-checks";
import { ResolveAlertButton } from "@/features/admin-console/components/resolve-alert-button";
import { SpendChart } from "@/features/admin-console/components/spend-chart";
import { everyDay } from "@/features/admin-console/components/spend-days";
import { alertsResponse, monitoringSnapshotResponse, spendResponse, usageResponse } from "@/lib/go-api/admin-schemas";
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

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const PROVIDER_NAMES: Readonly<Record<string, string>> = { kie: "KIE", apify: "Apify", gemini: "Gemini", resend: "Resend", stripe: "Stripe" };

const usd = (value: number): string => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function AdminMonitoringPage(): Promise<ReactNode> {
  const [alerts, snapshot, usage, apiHealth, apiReady, spend] = await Promise.all([
    goApi("/api/v1/admin/alerts?open=true", alertsResponse),
    goApi("/api/v1/admin/monitoring", monitoringSnapshotResponse),
    goApi("/api/v1/admin/credits/usage?days=7", usageResponse),
    goApi("/health", apiHealthResponse, { anonymous: true }),
    goApi("/ready", apiReadyResponse, { anonymous: true }),
    goApi("/api/v1/admin/spend?days=7", spendResponse),
  ]);

  const server: ServiceStatus[] = [
    { name: "API", ok: apiHealth.ok, label: apiHealth.ok ? "Up" : "Down", detail: apiReady.ok ? apiReady.data.version.slice(0, 7) : undefined },
    {
      name: "Database",
      ok: apiReady.ok ? apiReady.data.checks.database === "ok" : null,
      label: apiReady.ok ? (apiReady.data.checks.database === "ok" ? "Up" : "Down") : "Unknown",
    },
  ];
  const spent = usage.ok ? usage.data.data.actions.reduce((sum, row) => sum + row.estimatedCostUsd, 0) : null;
  const data = snapshot.ok ? snapshot.data.data : null;

  return (
    <div className="space-y-6">
      <AdminHeader title="Monitoring" subtitle="How the services are doing right now." />

      <MonitoringChecks server={server} />

      {data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Video jobs">
              <div className="px-4 pb-3 pt-5">
                <ColumnChart
                  columns={[
                    { label: "Waiting", value: data.jobs.queued },
                    { label: "Running", value: data.jobs.running },
                    { label: "Done", value: data.jobs.completed },
                    { label: "Ready", value: data.jobs.ready },
                    { label: "Failed", value: data.jobs.failed, bad: true },
                  ]}
                />
              </div>
            </Panel>
            <Panel title="Posting">
              <div className="px-4 pb-3 pt-5">
                <ColumnChart
                  columns={[
                    { label: "Prep", value: data.posts.preparing },
                    { label: "Queued", value: data.posts.scheduled },
                    { label: "Posting", value: data.posts.publishing },
                    { label: "Posted", value: data.posts.published },
                    { label: "Stopped", value: data.posts.cancelled },
                    { label: "Failed", value: data.posts.failed, bad: true },
                  ]}
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="AI cost, last 7 days" action={<span className="text-xs font-medium tabular-nums text-ink">{spent === null ? "-" : usd(spent)}</span>}>
              <div className="px-4 pb-3 pt-6">
                {spend.ok ? <SpendChart days={everyDay(7, spend.data.data.daily)} height={130} /> : <p className="text-sm text-destructive">{spend.message}</p>}
              </div>
            </Panel>
            <Panel title="Storage" className="flex flex-col">
              <div className="flex flex-1 flex-col justify-between gap-5 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HardDrive className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[22px] font-semibold leading-none tabular-nums tracking-tight text-ink">{formatBytes(data.storage.mediaBytes)}</p>
                    <p className="mt-1 text-xs text-ink-soft">Uploaded and generated media</p>
                  </div>
                </div>
                <dl className="divide-y divide-hairline rounded-lg border border-hairline text-[13px]">
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-ink-soft">Files</dt>
                    <dd className="font-medium tabular-nums text-ink">{data.storage.mediaObjects.toLocaleString("en-US")}</dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-2">
                    <dt className="text-ink-soft">Average file</dt>
                    <dd className="font-medium tabular-nums text-ink">
                      {data.storage.mediaObjects > 0 ? formatBytes(Math.round(data.storage.mediaBytes / data.storage.mediaObjects)) : "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
          </div>

          <Panel title="Recent failures">
            {data.recentFailures.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-ink-soft">None in the last {data.recentFailureDays} days.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {data.recentFailures.map((failure, index) => (
                  <li key={`${failure.source}-${failure.name}-${failure.at}-${index}`} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium capitalize text-ink">
                        {failure.source} · {failure.name}
                      </span>
                      <time className="text-xs text-ink-soft" dateTime={failure.at}>
                        {when(failure.at)}
                      </time>
                    </div>
                    {failure.message ? <p className="mt-0.5 break-words text-xs text-ink-soft">{failure.message}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {snapshot.ok ? "" : snapshot.message}
        </p>
      )}

      <Panel
        title="Open alerts"
        action={
          <Link href={"/dashboard/admin/alerts" as Route} className="text-xs font-medium text-primary hover:underline">
            All alerts
          </Link>
        }
      >
        {!alerts.ok ? (
          <p role="alert" className="px-4 py-4 text-sm text-destructive">
            {alerts.message}
          </p>
        ) : alerts.data.data.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-ink-soft">Nothing needs attention.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {alerts.data.data.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {PROVIDER_NAMES[alert.provider] ?? alert.provider} · {alert.kind === "quota" ? "running out of credit" : "key refused"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {alert.count} {alert.count === 1 ? "time" : "times"}
                  </p>
                </div>
                <ResolveAlertButton id={alert.id} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
