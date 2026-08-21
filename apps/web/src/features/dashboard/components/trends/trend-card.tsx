"use client";

import { Bookmark, ExternalLink } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { categoryIcon, categoryLabel } from "@/lib/trends/categories";
import { type Trend } from "@/lib/trends/queries";
import { cn } from "@/lib/utils";

import { ConfidenceBadge } from "./confidence-badge";

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
  const Icon = categoryIcon(trend.category);

  return (
    // The card is a container, not a control: the title link and the save
    // button sit side by side so neither is nested inside the other.
    <article className="group relative flex flex-col rounded-xl border border-hairline bg-paper p-5 transition-colors focus-within:border-ink-soft hover:border-ink-soft">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cloud">
          <Icon
            className="size-5 text-ink-soft transition-colors group-hover:text-ink"
            aria-hidden
          />
        </span>

        <div className="flex items-center gap-1.5">
          <ConfidenceBadge confidence={trend.confidence} />

          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${trend.title} from saved` : `Save ${trend.title}`}
            className="relative z-10 inline-flex size-7 cursor-pointer pointer-coarse:size-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

      <div className="mt-4 flex items-center justify-between gap-2 pt-1">
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Icon className="size-3.5" aria-hidden />
          {categoryLabel(trend.category)}
        </span>

        {/* Above the stretched link, so the source stays independently
            clickable: a claim the reader cannot check is worth less. */}
        {trend.sourceUrl ? (
          <a
            href={trend.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center gap-1 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Source
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}
