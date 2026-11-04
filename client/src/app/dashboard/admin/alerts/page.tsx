import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ResolveAlertButton } from "@/features/admin-console/components/resolve-alert-button";
import { alertsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Alerts" };

export default async function AdminAlertsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/alerts?open=true", alertsResponse);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Alerts</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Problems only you can fix, such as a provider running out of credit or a key being refused.
      </p>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{result.message}</p>
      ) : result.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nothing needs attention.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {result.data.data.map((alert) => (
            <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {alert.provider} · {alert.kind === "quota" ? "out of credit" : "key problem"}
                </p>
                <p className="text-xs text-ink-soft">
                  {alert.message} · seen {alert.count} {alert.count === 1 ? "time" : "times"}
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
