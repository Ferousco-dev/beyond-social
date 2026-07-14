"use client";

import { ArrowUpRight, Flame, Search } from "lucide-react";
import { useState } from "react";
import { type Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { CATEGORIES, TRENDS, type Trend } from "@/lib/trends/data";

export function TrendsFeed({ onNavigate }: { onNavigate?: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTrends = TRENDS.filter((trend) => {
    const matchesCategory = selectedCategory === "all" || trend.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      trend.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trend.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const growingTrends = filteredTrends.filter((t) => t.growing);
  const stableTrends = filteredTrends.filter((t) => !t.growing);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Trends</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Discover trending formats to remix for your content
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trends..."
            className="h-11 w-full rounded-full border border-hairline bg-paper pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-ring sm:w-72"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selectedCategory === "all"
              ? "bg-ink text-paper"
              : "border border-hairline text-ink hover:bg-cloud",
          )}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "flex whitespace-nowrap items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              selectedCategory === category.id
                ? "bg-ink text-paper"
                : "border border-hairline text-ink hover:bg-cloud",
            )}
          >
            <category.icon className="size-4" />
            {category.label}
          </button>
        ))}
      </div>

      {filteredTrends.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-cloud py-12">
          <Search className="size-8 text-ink-soft" />
          <p className="mt-3 text-sm font-medium text-ink">No trends found</p>
          <p className="mt-1 text-sm text-ink-soft">Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {growingTrends.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Flame className="size-5 text-warning" />
                <h2 className="text-base font-semibold text-ink">Growing now</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {growingTrends.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {stableTrends.length > 0 && (
            <section>
              <h2 className="mb-4 text-base font-semibold text-ink">Popular formats</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stableTrends.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TrendCard({ trend, onNavigate }: { trend: Trend; onNavigate?: () => void }) {
  const category = CATEGORIES.find((c) => c.id === trend.category);

  return (
    <Link
      href={`/dashboard/c/new?prompt=${encodeURIComponent(trend.prompt)}` as Route}
      onClick={onNavigate}
      className="group block rounded-xl border border-hairline bg-paper p-5 transition-colors hover:bg-cloud"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-cloud">
          <trend.icon className="size-5 text-ink-soft group-hover:text-ink" />
        </div>
        {trend.growing && (
          <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            <Flame className="size-3" />
            Growing
          </div>
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-ink group-hover:text-primary">
        {trend.title}
      </h3>
      <p className="mt-1.5 text-sm text-ink-soft">{trend.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
          {category && <category.icon className="size-3.5" />}
          <span>{category?.label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <span>{trend.engagement}</span>
          <ArrowUpRight className="size-3" />
        </div>
      </div>
    </Link>
  );
}
