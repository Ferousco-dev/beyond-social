import { ChevronRight } from "lucide-react";
import { type Metadata, type Route } from "next";
import Link from "next/link";

import { SETTINGS_SECTIONS } from "@/features/settings/nav";

export const metadata: Metadata = { title: "Settings" };

/**
 * The section list.
 *
 * On a phone this is the settings screen: rows with a chevron, each pushing to
 * its own screen. On a desktop the rail already lists the sections, so this
 * reads as the landing overview and carries the descriptions the rail has no
 * room for.
 */
export default function SettingsPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink lg:hidden">Settings</h1>

      <ul className="overflow-hidden rounded-xl border border-hairline bg-paper">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.href} className="border-b border-hairline last:border-b-0">
            <Link
              href={section.href as Route}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            >
              <section.icon className="size-5 shrink-0 text-ink-soft" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{section.label}</span>
                <span className="block text-xs text-ink-soft">{section.description}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
