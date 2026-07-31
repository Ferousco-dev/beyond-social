import { ToggleLeft } from "lucide-react";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = { title: "Feature flags" };

/**
 * Flags are the console's first state changing surface, so the rule that
 * governs the whole app shows up here first: a toggle that cannot write an
 * audit row must not ship. The empty state says so rather than rendering
 * switches that would flip nothing.
 */
export default function FlagsPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Roll a capability out or pull it back. Every change records who changed it, what it was, and what it became."
      />

      <Section title="Flags" description="One row per flag, with its current value.">
        <EmptyState
          icon={ToggleLeft}
          title="No data source connected"
          description="Toggles appear once the flag table and its admin gated write exist. A toggle that cannot write to admin_audit_log will not be shown, since an unaudited change is not allowed here."
        />
      </Section>
    </>
  );
}
