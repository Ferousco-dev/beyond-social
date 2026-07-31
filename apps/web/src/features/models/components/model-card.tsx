"use client";

import { Coins, Lock } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { PLAN_CATALOGUE } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

import { creditLabel, FAMILY_META, type MarketModel } from "../types";
import { SelectModelButton } from "./select-model-button";

const BILLING = "/dashboard/settings/billing" as Route;

/** Enough to read the shape of a model without turning the card into a list. */
const VISIBLE_CAPABILITIES = 3;

export function ModelCard({ model }: { model: MarketModel }) {
  const family = FAMILY_META[model.family];
  const locked = model.access.state === "locked";
  const extra = model.capabilities.length - VISIBLE_CAPABILITIES;

  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-paper p-4 transition-colors",
        model.isPreferred ? "border-ink" : "border-hairline hover:border-ink-soft/40",
      )}
    >
      <div className="flex items-center gap-2">
        <family.icon className="size-4 shrink-0 text-ink-soft" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          {model.provider} / {family.label}
        </span>
        {locked ? <Lock className="ml-auto size-3.5 shrink-0 text-ink-soft" aria-hidden /> : null}
      </div>

      <h3 className="mt-2.5 text-sm font-semibold text-ink">{model.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">{model.description}</p>

      {model.capabilities.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1">
          {model.capabilities.slice(0, VISIBLE_CAPABILITIES).map((capability) => (
            <li
              key={capability}
              className="rounded-md bg-cloud px-1.5 py-0.5 text-[11px] text-ink-soft"
            >
              {capability}
            </li>
          ))}
          {extra > 0 ? (
            <li className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-soft">+{extra} more</li>
          ) : null}
        </ul>
      ) : null}

      {/* Price sits above the action and never below it: the cost of a run is
          known before the run, not discovered after it. */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
          <Coins className="size-3.5 text-ink-soft" aria-hidden />
          <span className="tabular-nums">{creditLabel(model.creditCost)}</span>
          <span className="font-normal text-ink-soft">/ run</span>
        </span>

        {model.access.state === "locked" ? (
          <Link
            href={BILLING}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cloud pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Upgrade to {PLAN_CATALOGUE[model.access.requiredPlan].name}
          </Link>
        ) : (
          <SelectModelButton
            modelId={model.id}
            familyLabel={family.label}
            isPreferred={model.isPreferred}
          />
        )}
      </div>

      {model.access.state === "no_credits" ? (
        <p className="mt-2 text-[11px] text-ink-soft">
          You have {model.access.balance} credits.{" "}
          <Link href={BILLING} className="underline underline-offset-2 hover:text-ink">
            Top up
          </Link>{" "}
          to run this.
        </p>
      ) : null}

      {model.isPreferred ? (
        <p className="mt-2 text-[11px] text-ink-soft">
          Saved as your default. The generator does not read defaults yet.
        </p>
      ) : null}
    </li>
  );
}
