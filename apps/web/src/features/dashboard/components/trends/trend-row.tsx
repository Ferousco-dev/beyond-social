"use client";

import { Bookmark } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { categoryIcon, categoryLabel } from "@/lib/trends/categories";
import { type Trend } from "@/lib/trends/queries";
import { cn } from "@/lib/utils";

import { ConfidenceBadge } from "./confidence-badge";

export function TrendRow({
  trend,
  rank,
  saved,
  onToggleSave,
  onNavigate,
}: {
  trend: Trend;
  rank: number;
  saved: boolean;
  onToggleSave: () => void;
  onNavigate?: () => void;
}) {
  const Icon = categoryIcon(trend.category);

  return (
    <li className="group relative flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-0 hover:bg-cloud/60">
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink-soft">{rank}</span>

      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cloud">
        <Icon className="size-4 text-ink-soft" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-ink">
          <Link
            href={`/dashboard/c/new?prompt=${encodeURIComponent(trend.prompt)}` as Route}
            onClick={onNavigate}
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-hover:text-primary"
          >
            {trend.title}
          </Link>
        </h3>
        <p className="truncate text-xs text-ink-soft">{trend.description}</p>
      </div>

      <span className="hidden w-32 shrink-0 truncate text-xs text-ink-soft md:block">
        {categoryLabel(trend.category)}
      </span>

      <span className="hidden shrink-0 sm:block">
        <ConfidenceBadge confidence={trend.confidence} />
      </span>

      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${trend.title} from saved` : `Save ${trend.title}`}
        className="relative z-10 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-hairline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Bookmark className={cn("size-4", saved && "fill-current text-ink")} aria-hidden />
      </button>
    </li>
  );
}
