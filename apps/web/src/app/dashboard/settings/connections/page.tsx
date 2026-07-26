import { type Metadata } from "next";

import { ConnectionList } from "@/features/social/components/connection-list";
import { listConnections } from "@/lib/social/connections";

export const metadata: Metadata = { title: "Connections" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [connections, params] = await Promise.all([listConnections(), searchParams]);

  return (
    <section className="mt-8">
      <p className="text-sm text-ink-soft">
        Connect the accounts you publish to. Beyond Social posts on your behalf and never stores
        your platform password.
      </p>

      <div className="mt-5">
        <ConnectionList connections={connections} status={params.status} />
      </div>
    </section>
  );
}
