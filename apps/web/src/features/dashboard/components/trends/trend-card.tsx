"use client";

import { ArrowUpRight, Bookmark, TrendingDown, TrendingUp } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { formatCount } from "@/lib/dashboard/analytics";
import { CATEGORIES, type Trend } from "@/lib/trends/data";
import { cn } from "@/lib/utils";

export function TrendCard({
  trend,
  saved,
  onToggleSave,
  onNavigate,
}: {
  trend: Trend;
  saved: boolean;
  onToggleSave: () => void;
  onNavigate?: () => void;
}) {
  const category = CATEGORIES.find((item) => item.id === trend.category);
  const rising = trend.growthPercent >= 0;
  const Trend = rising ? TrendingUp : TrendingDown;

  return (
    // The card is a container, not a control: the title link and the save
    // button sit side by side so neither is nested inside the other.
    <article className="group relative flex flex-col rounded-xl border border-hairline bg-paper p-5 transition-colors focus-within:border-ink-soft hover:border-ink-soft">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cloud">
          <trend.icon
            className="size-5 text-ink-soft transition-colors group-hover:text-ink"
            aria-hidden
          />
        </span>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              rising ? "bg-success/10 text-success" : "bg-cloud text-ink-soft",
            )}
          >
            <Trend className="size-3" aria-hidden />
            {rising ? "+" : ""}
            {trend.growthPercent}%
          </span>

          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${trend.title} from saved` : `Save ${trend.title}`}
            className="relative z-10 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Bookmark className={cn("size-4", saved && "fill-current text-ink")} aria-hidden />
          </button>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-ink">
        {/* Stretched link keeps the whole card clickable without wrapping it. */}
        <Link
          href={`/dashboard/c/new?prompt=${encodeURIComponent(trend.prompt)}` as Route}
          onClick={onNavigate}
          className="after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {trend.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-ink-soft">{trend.description}</p>

      <div className="mt-4 flex items-center justify-between pt-1">
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          {category ? <category.icon className="size-3.5" aria-hidden /> : null}
          {category?.label}
        </span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-ink-soft">
          {formatCount(trend.views)} views
          <ArrowUpRight className="size-3" aria-hidden />
        </span>
      </div>
    </article>
  );
}
