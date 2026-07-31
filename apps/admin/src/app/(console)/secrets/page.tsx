import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { SecretsView } from "@/features/secrets/secrets-view";

export const metadata: Metadata = { title: "Secrets" };

/**
 * Never cached. A page that answers "is this credential in place" must not be
 * able to answer with a state from ten minutes ago.
 */
export const dynamic = "force-dynamic";

export default function SecretsPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Secrets"
        description="What the platform needs, whether it is set, and who rotated it last."
      />

      <p className="rounded-xl border border-hairline bg-cloud px-4 py-3 text-sm text-ink-soft">
        No secret value is ever shown here. The console holds the last four characters so a row can
        be matched against the provider that issued the key, and nothing more: there is no function,
        page or action in this application that can read a value back. Recording a rotation updates
        this registry, it does not change the deployment. Set the value where it lives first, then
        record it here, and for anything held in Vercel redeploy before expecting it to take effect.
      </p>

      <SecretsView />
    </>
  );
}
