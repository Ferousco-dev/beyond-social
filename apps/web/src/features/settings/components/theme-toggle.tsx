"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { type Theme } from "@/lib/theme";
import { applyTheme, readTheme, writeTheme } from "@/lib/theme-client";
import { cn } from "@/lib/utils";

/**
 * The three-way theme switch, small enough to sit on one row of a menu.
 *
 * It reads the cookie on mount rather than taking the theme as a prop: the
 * sidebar that renders it is a client component several levels below the layout,
 * and threading the value down only to display it would put a server read in the
 * path of every dashboard render.
 */

const OPTIONS: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "auto", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

export function ThemeToggle() {
  // Starts at the documented default and corrects on mount, because the cookie
  // is not readable while rendering.
  const [selected, setSelected] = useState<Theme>("light");

  useEffect(() => {
    setSelected(readTheme());
  }, []);

  function choose(theme: Theme): void {
    setSelected(theme);
    applyTheme(theme);
    writeTheme(theme);
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-hairline p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          aria-label={option.label}
          aria-pressed={selected === option.value}
          className={cn(
            "inline-flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            selected === option.value
              ? "bg-cloud text-ink"
              : "text-ink-soft hover:bg-cloud/60 hover:text-ink",
          )}
        >
          <option.icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
