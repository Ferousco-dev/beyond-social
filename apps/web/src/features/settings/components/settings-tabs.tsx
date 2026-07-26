"use client";

import { type Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SETTINGS_SECTIONS } from "../nav";
import { cn } from "@/lib/utils";

/** Section switcher, so settings reads as one area rather than three pages. */
export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="border-b border-hairline">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {SETTINGS_SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                <section.icon className="size-4" aria-hidden />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
