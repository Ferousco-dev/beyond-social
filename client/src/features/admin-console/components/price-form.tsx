"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PriceRow } from "@/lib/go-api/admin-schemas";

import { savePrice } from "../actions";
import { actionName } from "../action-names";
import { CREDIT_USD } from "../pricing-config";
import { useAdminAction } from "../use-admin-action";


const usd = (value: number): string => `$${value.toFixed(value < 0.1 ? 3 : 2)}`;

export function PriceForm({ price }: { readonly price: PriceRow }): ReactNode {
  const [credits, setCredits] = useState(String(price.credits));
  const [enabled, setEnabled] = useState(price.enabled);
  const { pending, error, run } = useAdminAction();
  const amount = Number(credits);
  const valid = credits.trim() !== "" && Number.isInteger(amount) && amount >= 0;
  const changed = amount !== price.credits || enabled !== price.enabled;
  // What a user pays at the base price, and what is left after the provider is paid.
  const charged = amount * CREDIT_USD;
  const left = charged - price.costUsd;
  const losing = valid && left < 0;

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{actionName(price.action)}</p>
          <p className="text-xs text-ink-soft">
            Per {price.unit}. {price.provider} charges about {usd(price.costUsd)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <Input
            inputMode="numeric"
            aria-label={`Credits for ${actionName(price.action)}`}
            className="w-20"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
          />
          credits
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          On
        </label>
        <Button disabled={pending || !changed || !valid} onClick={() => run(() => savePrice(price.action, amount, enabled))}>
          Save
        </Button>
      </div>
      {valid ? (
        <p className={`mt-1.5 text-xs ${losing ? "text-destructive" : "text-ink-soft"}`}>
          Users pay {usd(charged)}. {losing ? `You lose ${usd(-left)}` : `You keep ${usd(left)}`} on each.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
