import { Activity, AlertTriangle, Coins, ShieldAlert, Users } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FlagToggle } from "@/features/admin/components/flag-toggle";
import { getFeatureFlags, getPendingCandidates, getPlatformStats } from "@/lib/dashboard/admin";
import { getProviderCreditAccounts } from "@/lib/dashboard/admin/provider-credits";

export const metadata: Metadata = { title: "Admin · Overview" };

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-hairline bg-paper p-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

async function StatsSection() {
  const stats = await getPlatformStats(24);
  if (!stats) return <p className="mt-6 text-sm text-ink-soft">Stats are unavailable.</p>;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Users" value={stats.users.toLocaleString()} icon={Users} />
      <Stat label="Organizations" value={stats.orgs.toLocaleString()} icon={Users} />
      <Stat label="Generations" value={stats.generations.toLocaleString()} icon={Activity} />
      <Stat
        label="Failed generations"
        value={stats.failedGenerations.toLocaleString()}
        icon={ShieldAlert}
      />
      <Stat label="AI calls" value={stats.aiCalls.toLocaleString()} icon={Activity} />
      <Stat label="AI spend" value={`$${stats.aiCost.toFixed(4)}`} icon={Coins} />
      <Stat label="AI failures" value={stats.aiFailures.toLocaleString()} icon={ShieldAlert} />
      <Stat label="Cached calls" value={stats.cachedCalls.toLocaleString()} icon={Coins} />
    </div>
  );
}

function FlagsSkeleton() {
  return (
    <ul className="mt-3 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-xl border border-hairline bg-paper p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
        </li>
      ))}
    </ul>
  );
}

async function FlagsSection() {
  const flags = await getFeatureFlags();
  return (
    <ul className="mt-3 space-y-2">
      {flags.map((flag) => (
        <li
          key={flag.key}
          className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-paper p-4"
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink">{flag.key}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{flag.description}</p>
          </div>
          <FlagToggle flagKey={flag.key} enabled={flag.enabled} />
        </li>
      ))}
    </ul>
  );
}

async function PendingSection() {
  const pending = await getPendingCandidates(5);
  if (pending.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">Pending knowledge candidates</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Awaiting moderation review before they can be auto-promoted.
      </p>
      <ul className="mt-3 space-y-2">
        {pending.map((candidate) => (
          <li
            key={candidate.id}
            className="rounded-xl border border-hairline bg-paper p-4 text-xs text-ink-soft"
          >
            <span className="font-mono text-ink">{candidate.id}</span>
            <span className="ml-2">{new Date(candidate.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ProviderCreditAlerts() {
  const accounts = await getProviderCreditAccounts();
  const alerts = accounts.filter((account) => account.needsAttention);
  if (alerts.length === 0) return null;

  return (
    <section
      className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4"
      aria-labelledby="provider-credit-alerts"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div>
          <h2 id="provider-credit-alerts" className="text-sm font-semibold text-ink">
            Provider credits need attention
          </h2>
          <ul className="mt-1 space-y-1 text-sm text-ink-soft">
            {alerts.map((account) => (
              <li key={account.key}>
                <span className="capitalize">{account.provider}</span>{" "}
                {account.daysUntilExpiry !== null && account.daysUntilExpiry < 0
                  ? `expired ${Math.abs(account.daysUntilExpiry)} days ago.`
                  : `expires in ${account.daysUntilExpiry} days.`}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/admin/provider-credits"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Review provider credits
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-soft">Platform health over the last 24 hours.</p>

      <Suspense fallback={null}>
        <ProviderCreditAlerts />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Feature flags</h2>
        <Suspense fallback={<FlagsSkeleton />}>
          <FlagsSection />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <PendingSection />
      </Suspense>
    </div>
  );
}
