"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { saveOverage } from "./actions";

/** Extra usage: keep going on credits when a limit is full, up to a monthly cap. */
export function OverageForm({ enabled, cap, used, balance }: { readonly enabled: boolean; readonly cap: number; readonly used: number; readonly balance: number }): ReactNode {
  const [on, setOn] = useState(enabled);
  const [limit, setLimit] = useState(String(cap || 100));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const save = (): void =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveOverage({ enabled: on, cap: Number(limit) });
      setMessage(result.ok ? "Saved." : (result.message ?? "Could not save."));
    });

  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-paper p-4">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 size-4 accent-primary" />
        <span>
          <span className="block text-sm font-medium text-ink">Keep going on credits when a limit is full</span>
          <span className="block text-xs text-ink-soft">Off by default. When on, work that would be blocked is paid for from your credits instead, up to the cap below each month.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink-soft">
          Monthly cap (credits)
          <Input className="mt-1 w-32" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} disabled={!on} />
        </label>
        <Button size="sm" disabled={pending || (on && !(Number(limit) >= 0))} onClick={save}>
          Save
        </Button>
      </div>
      <p className="text-xs text-ink-soft">
        Used this month: {used} credits. Balance: {balance} credits.
      </p>
      {message ? (
        <p role="status" className="text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </div>
  );
}
