import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { ThemeToggle } from "@/features/shell/components/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage(): ReactNode {
  return (
    <>
      <PageHeader title="Settings" description="Preferences for this console." />

      <Section title="Appearance" description="Applies to this console and to the product.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-paper px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm text-ink">Theme</p>
            <p className="text-sm text-ink-soft">
              Stored in the shared bs-theme cookie, so both apps stay in step.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      {/* This page used to hold an empty credentials panel. The registry it was
          waiting for exists now, so it points there rather than becoming a
          second, staler answer to the same question. */}
      <Section
        title="Credentials"
        description="Presence, last four characters and rotation time. Never the value."
      >
        <Link
          href="/secrets"
          className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-paper px-4 py-3 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="space-y-0.5">
            <span className="block text-sm text-ink">Secrets registry</span>
            <span className="block text-sm text-ink-soft">
              What the platform needs, whether it is set, and who rotated it last.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-soft" aria-hidden />
        </Link>
      </Section>
    </>
  );
}
