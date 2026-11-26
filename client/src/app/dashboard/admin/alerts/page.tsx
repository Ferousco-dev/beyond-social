import { type Metadata } from "next";
import { type ReactNode } from "react";

import { AlertEmailForm } from "@/features/admin-console/components/alert-email-form";
import { ResolveAlertButton } from "@/features/admin-console/components/resolve-alert-button";
import { alertEmailResponse, alertsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Alerts" };

const NAMES: Readonly<Record<string, string>> = { kie: "KIE", apify: "Apify", gemini: "Gemini", resend: "Resend", stripe: "Stripe" };

export default async function AdminAlertsPage(): Promise<ReactNode> {
  const [result, email] = await Promise.all([
    goApi("/api/v1/admin/alerts?open=true", alertsResponse),
    goApi("/api/v1/admin/alerts/email", alertEmailResponse),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Alerts</h1>
        <p className="mt-1 text-sm text-ink-soft">Problems only you can fix.</p>
      </header>

      <AlertEmailForm current={email.ok ? email.data.data.email : ""} />

      {!result.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      ) : result.data.data.length === 0 ? (
        <p className="rounded-xl border border-hairline bg-paper px-4 py-6 text-center text-sm text-ink-soft">Nothing needs attention.</p>
      ) : (
        <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {result.data.data.map((alert) => (
            <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {NAMES[alert.provider] ?? alert.provider} · {alert.kind === "quota" ? "running out of credit" : "key refused"}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {alert.count} {alert.count === 1 ? "time" : "times"} · last {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.last_seen))}
                </p>
              </div>
              <ResolveAlertButton id={alert.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
