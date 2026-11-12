"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SettingRow } from "@/lib/go-api/admin-schemas";

import { saveSetting } from "../actions";
import { useAdminAction } from "../use-admin-action";

const LABELS: Readonly<Record<string, string>> = {
  signup_grant: "Credits a new account starts with",
  daily_user_limit: "Most credits one person can spend in a day (0 means no limit)",
  free_price_multiplier_pct: "Free plan price, as a percent of the normal price (200 means double)",
  pro_limit_five_hour: "Pro: usage points every five hours",
  pro_limit_week: "Pro: usage points each week (resets Monday 00:00 UTC)",
  free_searches_per_day: "Free plan: searches per day",
  free_search_results: "Free plan: results per search",
  pro_price_cents: "Pro price per month, in cents (2000 is $20.00)",
  stripe_tax_enabled: "Collect sales tax through Stripe (1 is on). Set up Stripe Tax first",
  overage_default_cap: "Suggested monthly cap on extra credits a Pro user can use",
  alert_kie_credits: "Warn me when KIE credits drop below",
  alert_apify_usd: "Warn me when the Apify balance (USD) drops below",
};

export function SettingForm({ setting }: { readonly setting: SettingRow }): ReactNode {
  const [value, setValue] = useState(String(setting.value));
  const { pending, error, run } = useAdminAction();

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <p className="min-w-0 flex-1 text-sm text-ink">{LABELS[setting.key] ?? setting.key}</p>
      <Input
        inputMode="numeric"
        aria-label={LABELS[setting.key] ?? setting.key}
        className="w-28"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button disabled={pending || Number(value) === setting.value} onClick={() => run(() => saveSetting(setting.key, Number(value)))}>
        Save
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
