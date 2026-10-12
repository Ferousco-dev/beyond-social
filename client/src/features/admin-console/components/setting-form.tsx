"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SettingRow } from "@/lib/go-api/admin-schemas";

import { saveSetting } from "../actions";
import { useAdminAction } from "../use-admin-action";

const LABELS: Readonly<Record<string, string>> = {
  signup_grant: "Free credits for a new account",
  daily_user_limit: "Most credits one user can spend per day (0 = no limit)",
  alert_kie_credits: "Alert when KIE credits fall below",
  alert_heygen_usd: "Alert when HeyGen balance (USD) falls below",
  alert_apify_usd: "Alert when Apify headroom (USD) falls below",
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
