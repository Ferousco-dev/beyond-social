"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { type Theme } from "@/lib/theme";
import { applyTheme, writeTheme } from "@/lib/theme-client";
import { cn } from "@/lib/utils";

const OPTIONS: readonly { value: Theme; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", hint: "The default", icon: Sun },
  { value: "dark", label: "Dark", hint: "Easier at night", icon: Moon },
  { value: "auto", label: "Auto", hint: "Follow your system", icon: Monitor },
];

export function ThemePicker({ current }: { current: Theme }) {
  const [selected, setSelected] = useState<Theme>(current);

  function choose(theme: Theme): void {
    setSelected(theme);

    // Both halves happen here: the class is what makes the click instant, the
    // cookie is what makes it survive a return visit.
    applyTheme(theme);
    writeTheme(theme);
  }

  return (
    <fieldset className="rounded-xl border border-hairline bg-paper p-5">
      <legend className="px-1 text-sm font-semibold text-ink">Theme</legend>
      <p className="mt-1 text-xs text-ink-soft">
        Saved to this browser, so it is still set when you come back.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors",
                active ? "border-primary bg-primary/5" : "border-hairline hover:bg-cloud",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                {/* The radio itself is the control, so it stays keyboard and
                    screen-reader operable rather than being faked with a div. */}
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={active}
                  onChange={() => choose(option.value)}
                  className="size-4 accent-primary"
                />
                <option.icon className="size-4 text-ink-soft" aria-hidden />
                {option.label}
              </span>
              <span className="pl-6 text-xs text-ink-soft">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
