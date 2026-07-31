"use client";

import { type Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { SETTINGS_SECTIONS } from "../nav";

/**
 * The desktop section rail.
 *
 * Replaces a row of tabs that had run out of room: with seven sections the last
 * one wrapped onto a second line inside a control that was one line tall, and
 * adding an eighth would have made it worse. A vertical list has no such limit
 * and is what a settings surface normally looks like.
 *
 * Hidden below `lg`, where the same sections are a full-screen list instead.
 */
export function SettingsRail() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="hidden w-56 shrink-0 lg:block">
      <ul className="sticky top-6 space-y-0.5">
        {SETTINGS_SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active
                    ? "bg-cloud font-medium text-ink"
                    : "text-ink-soft hover:bg-cloud/60 hover:text-ink",
                )}
              >
                <section.icon className="size-4 shrink-0" aria-hidden />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
