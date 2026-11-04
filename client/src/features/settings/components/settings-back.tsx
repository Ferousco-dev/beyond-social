"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { SETTINGS_SECTIONS } from "../nav";

/**
 * The phone header for one section: a back arrow to the section list and the
 * section's own name.
 *
 * Below `lg` a section is its own screen, the way it is in a native app, so it
 * needs a way back. Above `lg` the rail is on screen and this would be a second
 * label for something already visible, so it is hidden.
 */
export function SettingsBack(): ReactNode {
  const pathname = usePathname();
  const section = SETTINGS_SECTIONS.find((item) => item.href === pathname);
  if (!section) return null;

  return (
    <div className="mb-4 flex items-center gap-1 lg:hidden">
      <Link
        href="/dashboard/settings"
        aria-label="Back to settings"
        className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <h1 className="text-lg font-semibold tracking-tight text-ink">{section.label}</h1>
    </div>
  );
}
