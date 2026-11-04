"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_SHOWN = 50;

/**
 * A text field that suggests from a long list as you type, in place of the
 * browser's datalist. Typing a value outside the list is allowed.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  id,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const needle = (query ?? "").trim().toLowerCase();
    const found = needle === "" ? options : options.filter((option) => option.toLowerCase().includes(needle));
    return found.slice(0, MAX_SHOWN);
  }, [options, query]);

  function choose(option: string): void {
    onChange(option);
    setQuery(null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] !== undefined ? `${listId}-${active}` : undefined}
        value={query ?? value}
        placeholder={placeholder}
        maxLength={60}
        autoComplete="off"
        onFocus={(event) => {
          event.target.select();
          setOpen(true);
        }}
        onBlur={() => {
          if (query !== null && query.trim() !== "") onChange(query.trim());
          setQuery(null);
          setOpen(false);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && matches[active] !== undefined) {
            event.preventDefault();
            choose(matches[active]);
          } else if (event.key === "Escape") {
            setQuery(null);
            setOpen(false);
          }
        }}
        className="h-11 w-full rounded-[10px] border border-hairline bg-paper pl-3 pr-9 text-sm font-normal text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-hairline bg-paper p-1 shadow-lg"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              // Keep focus in the field so the click lands before blur closes the list.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "relative flex min-h-9 cursor-pointer items-center rounded-lg py-2 pl-3 pr-8 text-sm text-ink",
                index === active && "bg-cloud",
              )}
            >
              {option}
              {option === value ? <Check className="absolute right-2.5 size-4" aria-hidden /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
