"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CreditPack } from "@/lib/go-api/schemas";

import { deleteCreditPack, saveCreditPack } from "../actions";
import { useAdminAction } from "../use-admin-action";

/** One row of the pack list. With no pack it is the form that adds a new one. */
export function PackForm({ pack }: { readonly pack: CreditPack | null }): ReactNode {
  const [name, setName] = useState(pack?.name ?? "");
  const [credits, setCredits] = useState(String(pack?.credits ?? ""));
  const [dollars, setDollars] = useState(pack ? (pack.price_cents / 100).toFixed(2) : "");
  const [enabled, setEnabled] = useState(pack?.enabled ?? true);
  const { pending, error, run } = useAdminAction();

  const cents = Math.round(Number(dollars) * 100);
  const save = (): void =>
    run(
      () => saveCreditPack(pack?.id ?? null, { name, credits: Number(credits), priceCents: cents, enabled, sort: pack?.sort ?? 100 }),
      pack ? undefined : () => { setName(""); setCredits(""); setDollars(""); },
    );

  return (
    <li className="flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-32 flex-1 text-xs text-ink-soft">
        Name
        <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Starter" />
      </label>
      <label className="w-28 text-xs text-ink-soft">
        Credits
        <Input className="mt-1" inputMode="numeric" value={credits} onChange={(e) => setCredits(e.target.value)} />
      </label>
      <label className="w-28 text-xs text-ink-soft">
        Price (USD)
        <Input className="mt-1" inputMode="decimal" value={dollars} onChange={(e) => setDollars(e.target.value)} />
      </label>
      <label className="flex h-11 items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-primary" />
        For sale
      </label>
      <Button disabled={pending || !name.trim() || !Number(credits) || !(cents >= 50)} onClick={save}>
        {pack ? "Save" : "Add pack"}
      </Button>
      {pack ? (
        <Button variant="ghost" disabled={pending} onClick={() => run(() => deleteCreditPack(pack.id))}>
          Delete
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
