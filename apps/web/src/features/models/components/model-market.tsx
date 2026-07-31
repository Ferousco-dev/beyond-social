"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { MODEL_FAMILIES } from "@/lib/models/types";

import { FAMILY_META, type MarketModel } from "../types";
import { FilterChips, type ChipOption } from "./filter-chips";
import { ModelCard } from "./model-card";

const ALL = "all";

function matchesQuery(model: MarketModel, query: string): boolean {
  if (query === "") return true;
  const haystack = [model.name, model.provider, model.description, ...model.capabilities]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * The catalogue, filtered in the browser.
 *
 * Filtering client-side rather than through the URL is a deliberate fit to the
 * data: the catalogue is a handful of rows that already arrived with the page,
 * so a round trip per keystroke would buy nothing. If it grows to the point
 * where the list is paged, this becomes a server query and the chips become
 * search params.
 */
export function ModelMarket({ models }: { models: readonly MarketModel[] }) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string>(ALL);
  const [provider, setProvider] = useState<string>(ALL);
  const searchId = useId();

  const normalised = query.trim().toLowerCase();

  // Counts are taken after search but before the chips themselves, so a chip
  // reading zero is telling the truth about what selecting it would show.
  const searched = useMemo(
    () => models.filter((model) => matchesQuery(model, normalised)),
    [models, normalised],
  );

  const familyOptions = useMemo<readonly ChipOption[]>(() => {
    const present = MODEL_FAMILIES.filter((id) => models.some((model) => model.family === id));
    return [
      { value: ALL, label: "All", count: searched.length },
      ...present.map((id) => ({
        value: id,
        label: FAMILY_META[id].label,
        icon: FAMILY_META[id].icon,
        count: searched.filter((model) => model.family === id).length,
      })),
    ];
  }, [models, searched]);

  const providerOptions = useMemo<readonly ChipOption[]>(() => {
    const present = [...new Set(models.map((model) => model.provider))].sort();
    return [
      { value: ALL, label: "Every provider", count: searched.length },
      ...present.map((id) => ({
        value: id,
        label: id,
        count: searched.filter((model) => model.provider === id).length,
      })),
    ];
  }, [models, searched]);

  const visible = useMemo(
    () =>
      searched.filter(
        (model) =>
          (family === ALL || model.family === family) &&
          (provider === ALL || model.provider === provider),
      ),
    [searched, family, provider],
  );

  return (
    <section className="mt-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <label htmlFor={searchId} className="sr-only">
            Search models
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, provider or capability"
            className="h-11 w-full rounded-lg border border-hairline bg-paper pl-10 pr-3.5 text-sm text-ink transition-colors placeholder:text-ink-soft focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <FilterChips label="Task" options={familyOptions} value={family} onChange={setFamily} />
        <FilterChips
          label="Provider"
          options={providerOptions}
          value={provider}
          onChange={setProvider}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} models shown
      </p>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-hairline px-4 py-10 text-center text-sm text-ink-soft">
          {models.length === 0
            ? "No models are listed yet."
            : "Nothing matches those filters. Clear the search or pick another task."}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </ul>
      )}
    </section>
  );
}
