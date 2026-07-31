import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { ConfigView } from "@/features/config/config-view";

export const metadata: Metadata = { title: "Configuration" };

/**
 * Never cached. A page whose whole purpose is to show the current value must
 * not be able to serve an old one.
 */
export const dynamic = "force-dynamic";

export default function ConfigPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Configuration"
        description="Operational limits and timeouts, with the history of who changed them. Secrets are not stored here and never will be."
      />

      <p className="rounded-xl border border-hairline bg-cloud px-4 py-3 text-sm text-ink-soft">
        Every setting below is stored in the database and every change is written to the audit log
        with its old and new value. None of them is marked live yet: the code that uses these
        numbers still holds them as constants, so a change here records the intended value and
        takes effect on the next deploy that reads it. Each description names the file to change.
      </p>

      <ConfigView />
    </>
  );
}
