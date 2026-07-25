"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Copy, MoreHorizontal, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type HistoryItem } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

const MENU_ITEM =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-cloud";

const STATUS_STYLES: Record<HistoryItem["status"], string> = {
  Published: "bg-success/10 text-success",
  Scheduled: "bg-primary/10 text-primary",
  Draft: "bg-cloud text-ink-soft",
};

const FILTERS = ["All", "Published", "Scheduled", "Draft"] as const;
type Filter = (typeof FILTERS)[number];

export function HistoryList({ initialItems }: { initialItems: readonly HistoryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<readonly HistoryItem[]>(initialItems);
  const [filter, setFilter] = useState<Filter>("All");

  const visible = filter === "All" ? items : items.filter((item) => item.status === filter);

  const duplicate = (item: HistoryItem): void => {
    const copy: HistoryItem = {
      ...item,
      id: `${item.id}-copy${items.length}`,
      title: `${item.title} (copy)`,
      status: "Draft",
    };
    setItems((current) => [copy, ...current]);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            aria-pressed={filter === option}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              filter === option
                ? "border-transparent bg-ink text-paper"
                : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-soft">
          Nothing {filter.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-hairline">
          {visible.map((item) => (
            <li
              key={item.id}
              className="group/row flex items-center justify-between gap-3 border-b border-hairline bg-paper px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{item.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {item.platform} · {item.when}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_STYLES[item.status],
                  )}
                >
                  {item.status}
                </span>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label={`Options for ${item.title}`}
                      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft opacity-0 transition-opacity hover:bg-cloud hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-hover/row:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      className="z-50 w-44 rounded-xl border border-hairline bg-paper p-1 text-ink shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                    >
                      <DropdownMenu.Item
                        className={MENU_ITEM}
                        onSelect={() => router.push(`/editor/${item.id}` as Route)}
                      >
                        <SquareArrowOutUpRight className="size-4 text-ink-soft" />
                        Open in editor
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className={MENU_ITEM} onSelect={() => duplicate(item)}>
                        <Copy className="size-4 text-ink-soft" />
                        Duplicate
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className={cn(
                          MENU_ITEM,
                          "text-destructive data-[highlighted]:bg-destructive/10",
                        )}
                        onSelect={() =>
                          setItems((current) => current.filter((entry) => entry.id !== item.id))
                        }
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
