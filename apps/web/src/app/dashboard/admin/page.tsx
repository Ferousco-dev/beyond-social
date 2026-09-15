import { Activity, Coins, ShieldAlert, Users } from "lucide-react";
import { type Metadata } from "next";

import { FlagToggle } from "@/features/admin/components/flag-toggle";
import { getFeatureFlags, getPendingCandidates, getPlatformStats } from "@/lib/dashboard/admin";

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

export default async function AdminOverviewPage() {
  const [stats, flags, pending] = await Promise.all([
    getPlatformStats(24),
    getFeatureFlags(),
    getPendingCandidates(5),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-soft">Platform health over the last 24 hours.</p>

      {stats ? (
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
      ) : (
        <p className="mt-6 text-sm text-ink-soft">Stats are unavailable.</p>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Feature flags</h2>
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
      </section>

      {pending.length > 0 && (
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
      )}
    </div>
  );
}
