import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";

import { SETTINGS_SECTIONS } from "@/features/settings/nav";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings hub. Exists so /dashboard/settings is a real destination rather
 * than a 404 that only its children avoid.
 */
export default function SettingsPage() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {SETTINGS_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href as Route}
          className="rounded-xl border border-hairline bg-paper p-5 transition-colors hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <section.icon className="size-5 text-ink-soft" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">{section.label}</p>
          <p className="mt-1 text-xs text-ink-soft">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
