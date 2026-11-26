"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { type PriceRow } from "@/lib/go-api/admin-schemas";

import { savePrice } from "../actions";
import { actionName } from "../action-names";
import { CREDIT_USD } from "../pricing-config";
import { useAdminAction } from "../use-admin-action";

const usd = (value: number): string => `$${value.toFixed(value < 0.1 ? 3 : 2)}`;

/** One action's price: its name and margin on the left, the credits and an on switch on the right. Save shows once something changed. */
export function PriceForm({ price }: { readonly price: PriceRow }): ReactNode {
  const [credits, setCredits] = useState(String(price.credits));
  const [enabled, setEnabled] = useState(price.enabled);
  const { pending, error, run } = useAdminAction();
  const amount = Number(credits);
  const valid = credits.trim() !== "" && Number.isInteger(amount) && amount >= 0;
  const changed = amount !== price.credits || enabled !== price.enabled;
  const left = amount * CREDIT_USD - price.costUsd;
  const losing = valid && left < 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{actionName(price.action)}</p>
        <p className={cn("mt-0.5 text-xs", losing ? "text-destructive" : "text-ink-soft")}>
          Per {price.unit} · costs {usd(price.costUsd)} · {valid ? (losing ? `you lose ${usd(-left)}` : `you keep ${usd(left)}`) : "enter a whole number"}
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {changed && valid ? (
          <button type="button" disabled={pending} onClick={() => run(() => savePrice(price.action, amount, enabled))} className="btn btn-primary btn-sm">
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input
            inputMode="numeric"
            aria-label={`Credits for ${actionName(price.action)}`}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className="h-7 w-11 rounded-md border border-hairline bg-paper px-1.5 text-right text-[13px] tabular-nums text-ink"
          />
          credits
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${actionName(price.action)} is ${enabled ? "on" : "off"}`}
          onClick={() => setEnabled(!enabled)}
          className={cn("relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors", enabled ? "bg-primary" : "bg-hairline")}
        >
          <span className={cn("inline-block size-3 rounded-full bg-white shadow-sm transition-transform", enabled ? "translate-x-[14px]" : "translate-x-0.5")} />
        </button>
      </div>
    </li>
  );
}
