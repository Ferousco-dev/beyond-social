import { Activity, CircleSlash, Coins, Database, Timer, Zap } from "lucide-react";
import { type ReactNode } from "react";

import Link from "next/link";

import { getCurrentPlan } from "@/lib/billing/current-plan";
import {
  USAGE_WINDOWS,
  getUsageSummary,
  isEngineReady,
  type UsageWindowId,
} from "@/lib/dashboard/usage";

function Tile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** AI spend and reliability for the signed-in user, from gateway usage records. */
export async function UsageOverview({ window }: { window: UsageWindowId }): Promise<ReactNode> {
  const [summary, plan] = await Promise.all([getUsageSummary(window), getCurrentPlan()]);
  const label = USAGE_WINDOWS.find((option) => option.id === window)?.label ?? "24 hours";
  const cacheRate = summary.calls > 0 ? summary.cachedCalls / summary.calls : 0;
  const failureRate = summary.calls > 0 ? summary.failedCalls / summary.calls : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Usage</h1>
      <p className="mt-1 text-sm text-ink-soft">AI spend and reliability, last {label}.</p>

      <nav aria-label="Time window" className="mt-6 flex gap-1.5">
        {USAGE_WINDOWS.map((option) => (
          <a
            key={option.id}
            href={`/dashboard/usage?window=${option.id}`}
            aria-current={option.id === window}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              option.id === window
                ? "border-transparent bg-ink text-canvas"
                : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
            }`}
          >
            {option.label}
          </a>
        ))}
      </nav>

      {summary.hasData ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile
            label="Spend"
            value={`$${summary.costUsd.toFixed(4)}`}
            hint={`${compact.format(summary.inputTokens + summary.outputTokens)} tokens`}
            icon={Coins}
          />
          <Tile label="Calls" value={compact.format(summary.calls)} icon={Activity} />
          <Tile
            label="Served from cache"
            value={`${Math.round(cacheRate * 100)}%`}
            hint={`${compact.format(summary.cachedCalls)} calls cost nothing`}
            icon={Database}
          />
          <Tile label="Median latency" value={`${summary.p50LatencyMs}ms`} icon={Timer} />
          <Tile
            label="Failed calls"
            value={`${Math.round(failureRate * 100)}%`}
            hint={`${compact.format(summary.failedCalls)} attempts errored`}
            icon={CircleSlash}
          />
          <Tile
            label="Output tokens"
            value={compact.format(summary.outputTokens)}
            hint="Billed at the higher rate"
            icon={Zap}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
          <p className="text-sm font-medium text-ink">No AI usage yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {isEngineReady()
              ? "Generate a video and this fills with the exact tokens, latency, and cost of every model call."
              : "Add the model provider keys and every model call will be recorded here with its exact tokens, latency, and cost."}
          </p>
        </div>
      )}

      {/* Plan and credits live in Settings > Billing, so there is one place to
          change a subscription rather than two that can disagree. */}
      <p className="mt-8 text-xs text-ink-soft">
        You are on the <span className="capitalize text-ink">{plan}</span> plan.{" "}
        <Link
          href="/dashboard/settings/billing"
          className="text-ink underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Manage billing
        </Link>
      </p>
    </div>
  );
}
