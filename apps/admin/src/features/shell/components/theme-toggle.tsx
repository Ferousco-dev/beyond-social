"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/**
 * The same three-way switch the product uses, over the same `bs-theme` cookie,
 * so a person moving between the two apps does not land in a different theme.
 *
 * The console writes the cookie from the client rather than through a server
 * action: it has no other reason to opt its pages out of static rendering, and
 * the pre-paint script in the root layout is what actually applies the value.
 */

const THEMES = ["auto", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const OPTIONS: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "auto", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

const COOKIE = "bs-theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

function readTheme(): Theme {
  const match = document.cookie.match(/(?:^|; )bs-theme=([^;]*)/);
  const value = match ? decodeURIComponent(match[1] ?? "") : "";
  return isTheme(value) ? value : "light";
}

function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function ThemeToggle(): ReactNode {
  // Starts at the documented default and corrects on mount, because the cookie
  // is not readable while rendering.
  const [selected, setSelected] = useState<Theme>("light");

  useEffect(() => {
    setSelected(readTheme());
  }, []);

  function choose(theme: Theme): void {
    setSelected(theme);
    applyTheme(theme);
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
