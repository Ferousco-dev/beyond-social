"use client";

import { Activity, CircleAlert, CircleCheck, CircleDashed, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

const healthSchema = z.object({ status: z.literal("ok"), service: z.literal("web"), timestamp: z.string() });
const readinessSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({ supabase: z.enum(["ok", "error", "skipped"]) }),
});

type CheckState = "checking" | "available" | "degraded" | "unavailable" | "not_configured";
type Check = { readonly name: string; readonly state: CheckState; readonly detail: string };

const initialChecks: readonly Check[] = [
  { name: "Web application", state: "checking", detail: "Requesting the live health endpoint." },
  { name: "Supabase sign-in", state: "checking", detail: "Requesting the readiness endpoint." },
];

function Indicator({ state }: { readonly state: CheckState }): ReactNode {
  if (state === "available") return <CircleCheck className="size-4 text-primary" aria-hidden />;
  if (state === "degraded" || state === "unavailable") return <CircleAlert className="size-4 text-destructive" aria-hidden />;
  return <CircleDashed className="size-4 text-ink-soft" aria-hidden />;
}

function stateLabel(state: CheckState): string {
  switch (state) {
    case "available": return "Available";
    case "degraded": return "Degraded";
    case "unavailable": return "Unavailable";
    case "not_configured": return "Not configured";
    case "checking": return "Checking";
  }
}

export function MonitoringChecks(): ReactNode {
  const [checks, setChecks] = useState<readonly Check[]>(initialChecks);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setPending(true);
    setChecks(initialChecks);
    const webStarted = performance.now();
    const [web, readiness] = await Promise.allSettled([
      fetch("/api/health", { cache: "no-store" }).then(async (response) => {
        const parsed = healthSchema.safeParse(await response.json());
        if (!response.ok || !parsed.success) throw new Error("Health endpoint did not return a valid response.");
        return Math.round(performance.now() - webStarted);
      }),
      fetch("/api/ready", { cache: "no-store" }).then(async (response) => {
        const parsed = readinessSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("Readiness endpoint did not return a valid response.");
        return parsed.data;
      }),
    ]);

    const webCheck: Check = web.status === "fulfilled"
      ? { name: "Web application", state: "available", detail: `Health endpoint responded in ${web.value} ms.` }
      : { name: "Web application", state: "unavailable", detail: "The health endpoint did not return a valid response." };
    const supabaseCheck: Check = readiness.status === "rejected"
      ? { name: "Supabase sign-in", state: "unavailable", detail: "The readiness endpoint could not be reached." }
      : readiness.value.checks.supabase === "skipped"
        ? { name: "Supabase sign-in", state: "not_configured", detail: "Supabase is not configured in this environment." }
        : readiness.value.checks.supabase === "error"
          ? { name: "Supabase sign-in", state: "degraded", detail: "The Supabase auth settings check failed." }
          : { name: "Supabase sign-in", state: "available", detail: "The Supabase auth settings check passed." };

    setChecks([webCheck, supabaseCheck]);
    setPending(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section aria-labelledby="live-checks-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="live-checks-heading" className="text-sm font-semibold text-ink">Current checks</h2>
          <p className="mt-1 text-xs text-ink-soft">Point-in-time checks only. They do not represent uptime history.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void refresh()}>
          <RotateCw aria-hidden />
          Refresh checks
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
        {checks.map((check) => (
          <li key={check.name} className="flex items-start justify-between gap-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5"><Indicator state={check.state} /></span>
              <div>
                <p className="text-sm font-medium text-ink">{check.name}</p>
                <p className="mt-1 text-sm text-ink-soft">{check.detail}</p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
              <Activity className="size-3.5" aria-hidden />{stateLabel(check.state)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}