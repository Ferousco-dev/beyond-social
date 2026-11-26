"use client";

import { useState, type ReactNode } from "react";

import { type SettingRow } from "@/lib/go-api/admin-schemas";

import { saveSetting } from "../actions";
import { useAdminAction } from "../use-admin-action";

/** Each setting in a few words, with what the number means beside it. */
const LABELS: Readonly<Record<string, readonly [string, string]>> = {
  signup_grant: ["Starting credits", "credits"],
  daily_user_limit: ["Daily spend limit per person", "credits, 0 = none"],
  free_price_multiplier_pct: ["Free plan price", "% of normal"],
  pro_limit_five_hour: ["Usage every five hours", "points"],
  pro_limit_week: ["Usage each week", "points"],
  free_searches_per_day: ["Searches per day", "searches"],
  free_search_results: ["Results per search", "results"],
  pro_price_cents: ["Monthly price", "cents"],
  stripe_tax_enabled: ["Collect sales tax", "1 = on"],
  overage_default_cap: ["Suggested extra-credit cap", "credits a month"],
  alert_kie_credits: ["Warn when KIE credits drop below", "credits"],
  alert_apify_usd: ["Warn when Apify drops below", "USD"],
};

/** One number setting: its name on the left, the value on the right. Save shows once it changed. */
export function SettingForm({ setting }: { readonly setting: SettingRow }): ReactNode {
  const [value, setValue] = useState(String(setting.value));
  const { pending, error, run } = useAdminAction();
  const [label, unit] = LABELS[setting.key] ?? [setting.key, ""];
  const changed = value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) !== setting.value;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{label}</p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {changed ? (
          <button type="button" disabled={pending} onClick={() => run(() => saveSetting(setting.key, Number(value)))} className="btn btn-primary btn-sm">
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input
            inputMode="numeric"
            aria-label={label}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-7 w-16 rounded-md border border-hairline bg-paper px-1.5 text-right text-[13px] tabular-nums text-ink"
          />
          {unit}
        </label>
      </div>
    </li>
  );
}
