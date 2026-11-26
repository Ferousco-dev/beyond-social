"use client";

import { RotateCw } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useOnMount } from "@/lib/hooks/use-page-effects";
import { z } from "zod";

import { Panel, StatusPill } from "@/features/admin/components/admin-ui";

const healthSchema = z.object({ status: z.literal("ok") });
const readinessSchema = z.object({ checks: z.object({ supabase: z.enum(["ok", "error", "skipped"]) }) });

export interface ServiceStatus {
  readonly name: string;
  /** True up, false down, null not known yet or not set up. */
  readonly ok: boolean | null;
  readonly label: string;
  readonly detail?: string;
}

const CHECKING: readonly ServiceStatus[] = [
  { name: "Web app", ok: null, label: "Checking" },
  { name: "Sign-in", ok: null, label: "Checking" },
];

/**
 * Every service on one panel: the web app and sign-in are checked from this
 * browser, the API and database by the server, and Refresh checks them again.
 */
export function MonitoringChecks({ server }: { server: readonly ServiceStatus[] }): ReactNode {
  const [web, setWeb] = useState<readonly ServiceStatus[]>(CHECKING);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setPending(true);
    setWeb(CHECKING);
    const started = performance.now();
    const [health, ready] = await Promise.allSettled([
      fetch("/api/health", { cache: "no-store" }).then(async (response) => {
        if (!response.ok || !healthSchema.safeParse(await response.json()).success) throw new Error("bad health");
        return Math.round(performance.now() - started);
      }),
      fetch("/api/ready", { cache: "no-store" }).then(async (response) => {
        const parsed = readinessSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("bad readiness");
        return parsed.data.checks.supabase;
      }),
    ]);
    setWeb([
      health.status === "fulfilled" ? { name: "Web app", ok: true, label: "Up", detail: `${health.value} ms` } : { name: "Web app", ok: false, label: "Down" },
      ready.status === "rejected"
        ? { name: "Sign-in", ok: false, label: "Down" }
        : ready.value === "skipped"
          ? { name: "Sign-in", ok: null, label: "Not set up" }
          : { name: "Sign-in", ok: ready.value === "ok", label: ready.value === "ok" ? "Up" : "Problem" },
    ]);
    setPending(false);
  }, []);

  useOnMount(() => void refresh());

  return (
    <Panel
      title="Services"
      action={
        <button type="button" onClick={() => void refresh()} disabled={pending} className="btn btn-ghost btn-sm h-7 px-2 text-xs">
          <RotateCw className={pending ? "animate-spin" : ""} aria-hidden />
          Refresh
        </button>
      }
    >
      <ul className="divide-y divide-hairline">
        {[...web, ...server].map((service) => (
          <li key={service.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-[13px] text-ink">{service.name}</span>
            <span className="flex items-center gap-2">
              {service.detail ? <span className="text-xs tabular-nums text-ink-soft">{service.detail}</span> : null}
              <StatusPill ok={service.ok} label={service.label} />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
