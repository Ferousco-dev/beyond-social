import { Activity, CircleDashed, Clock3 } from "lucide-react";
import { type Metadata } from "next";

import { PageShell } from "@/components/landing/page-shell";

import { HealthCheck } from "./health-check";

export const metadata: Metadata = { title: "Service status" };

const SERVICES = [
  { name: "Web application", detail: "Checked live from this page", live: true },
  { name: "Video generation", detail: "Provider monitoring is being connected", live: false },
  { name: "Social publishing", detail: "Platform monitoring is being connected", live: false },
  { name: "Billing", detail: "Public monitoring is being connected", live: false },
] as const;

export default function StatusPage() {
  return (
    <PageShell
      eyebrow="Status"
      title="Beyond Social systems"
      lede="A factual view of what we can measure publicly right now."
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-hairline bg-paper p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold text-ink">Partial monitoring available</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                The web app has a live reachability check. Provider uptime and historical uptime are
                not measured publicly yet, so this page does not claim they are operational.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="components-heading">
          <h2 id="components-heading" className="text-sm font-semibold text-ink">
            Components
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-hairline bg-paper">
            <ul className="divide-y divide-hairline">
              {SERVICES.map((service) => (
                <li
                  key={service.name}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{service.name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{service.detail}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium text-ink-soft">
                    <CircleDashed className="size-3.5" aria-hidden />
                    {service.live ? "Live check" : "Not monitored"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="live-heading">
          <h2 id="live-heading" className="text-sm font-semibold text-ink">
            Live web check
          </h2>
          <div className="mt-3">
            <HealthCheck />
          </div>
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-semibold text-ink">
            Incident history
          </h2>
          <div className="mt-3 rounded-2xl border border-hairline bg-paper p-5">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
              <div>
                <p className="text-sm font-medium text-ink">No public history yet</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  Incident and uptime history will appear here once persistent monitoring is live.
                  This is not a claim that there have been no incidents.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="text-sm leading-relaxed text-ink-soft">
          Having trouble? Email{" "}
          <a
            href="mailto:hello@beyondsocial.app"
            className="text-primary underline underline-offset-4"
          >
            hello@beyondsocial.app
          </a>{" "}
          with what you were doing, when it happened, and the trace id if one was shown.
        </p>
      </div>
    </PageShell>
  );
}
