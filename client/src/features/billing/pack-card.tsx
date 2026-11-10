"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type CreditPack } from "@/lib/go-api/schemas";

import { startCheckout } from "./actions";
import { formatPrice, perCredit } from "./format";

/** One pack for sale. Pressing Buy sends the person to Stripe's payment page. */
export function PackCard({ pack, highlighted }: { readonly pack: CreditPack; readonly highlighted: boolean }): ReactNode {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Stays true once Stripe's page is on its way, so a second click cannot open another checkout.
  const [leaving, setLeaving] = useState(false);

  const buy = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await startCheckout(pack.id);
      if (result.ok) {
        setLeaving(true);
        window.location.assign(result.url);
      }
      else setError(result.message);
    });

  return (
    <li className={`flex flex-col rounded-2xl border bg-paper p-6 ${highlighted ? "border-primary" : "border-hairline"}`}>
      <h3 className="text-sm font-medium text-ink-soft">{pack.name}</h3>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{pack.credits.toLocaleString("en-US")}</p>
      <p className="text-sm text-ink-soft">credits</p>
      <p className="mt-4 text-lg font-medium text-ink">{formatPrice(pack.price_cents, pack.currency)}</p>
      <p className="text-xs text-ink-soft">{perCredit(pack.price_cents, pack.credits, pack.currency)} per credit</p>
      <Button className="mt-5" variant={highlighted ? "default" : "outline"} disabled={pending || leaving} onClick={buy}>
        {pending || leaving ? "Opening checkout" : "Buy"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
