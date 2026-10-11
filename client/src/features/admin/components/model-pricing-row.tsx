"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ModelPricingRow } from "@/lib/dashboard/admin";
import { setModelCreditCost } from "../actions/model-pricing";

/** One model, its credit cost editable inline. No warning callout needed here
 * (see config-row.tsx for the one that does apply): there is no external
 * system this can fall out of sync with, so a wrong edit only costs the
 * platform margin, not a customer being billed something the site didn't
 * show them. */
export function ModelPricingRowItem({ row }: { readonly row: ModelPricingRow }) {
  const router = useRouter();
  const [draft, setDraft] = useState(row.creditCost);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = draft !== row.creditCost;

  function save() {
    setError(null);
    startTransition(() => {
      void setModelCreditCost({ modelId: row.id, creditCost: draft, reason }).then((result) => {
        if (!result.ok) setError(result.error);
        else {
          setReason("");
          router.refresh();
        }
      });
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{row.name}</p>
          <span className="shrink-0 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] text-ink-soft">
            {row.family}
          </span>
          {!row.isActive && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              inactive
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-xs text-ink-soft">
          {row.provider} / {row.id} · min plan {row.minPlan}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
          className="h-9 w-20"
          aria-label={`Credit cost for ${row.name}`}
        />
        {dirty && (
          <>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason"
              className="h-9 w-36"
              aria-label={`Reason for changing ${row.name}'s credit cost`}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || reason.trim().length === 0}
              onClick={save}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
