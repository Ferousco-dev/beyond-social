import { Check, Circle } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

import { setupResponse, type SetupCheck } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Setup" };

function groupChecks(checks: readonly SetupCheck[]): ReadonlyMap<string, readonly SetupCheck[]> {
  const groups = new Map<string, SetupCheck[]>();
  for (const check of checks) groups.set(check.group, [...(groups.get(check.group) ?? []), check]);
  return groups;
}

export default async function AdminSetupPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/setup", setupResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const { checks, ready, remaining } = result.data.data;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Setup</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {ready
          ? "Everything required is connected. The product is ready to run."
          : `${remaining} required ${remaining === 1 ? "item" : "items"} left before the product can run.`}{" "}
        Keys are pasted on the{" "}
        <Link href={"/dashboard/admin/providers" as Route} className="text-ink underline">
          provider keys
        </Link>{" "}
        page and take effect straight away.
      </p>

      <div className="mt-6 space-y-6">
        {[...groupChecks(checks)].map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-soft">
              {group}
            </h2>
            <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
              {items.map((check) => (
                <li key={check.id} className="flex items-start gap-3 px-4 py-3">
                  {check.done ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-label="Done" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-label="Not done" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      {check.label}
                      {!check.required ? <span className="ml-2 text-xs text-ink-soft">Optional</span> : null}
                    </p>
                    {check.hint && !check.done ? (
                      <p className="mt-0.5 text-xs text-ink-soft">{check.hint}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
