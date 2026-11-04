"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PriceRow } from "@/lib/go-api/admin-schemas";

import { savePrice } from "../actions";
import { useAdminAction } from "../use-admin-action";

export function PriceForm({ price }: { readonly price: PriceRow }): ReactNode {
  const [credits, setCredits] = useState(String(price.credits));
  const [enabled, setEnabled] = useState(price.enabled);
  const { pending, error, run } = useAdminAction();
  const changed = Number(credits) !== price.credits || enabled !== price.enabled;

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{price.action}</p>
        <p className="text-xs text-ink-soft">
          per {price.unit} · {price.provider} · est. cost ${price.costUsd.toFixed(2)}
        </p>
      </div>
      <Input
        inputMode="numeric"
        aria-label={`Credits for ${price.action}`}
        className="w-24"
        value={credits}
        onChange={(event) => setCredits(event.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        On
      </label>
      <Button disabled={pending || !changed} onClick={() => run(() => savePrice(price.action, Number(credits), enabled))}>
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
