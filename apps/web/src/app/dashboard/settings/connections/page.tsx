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
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Connections</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Connect the accounts you publish to. Beyond Social posts on your behalf and never stores
        your platform password.
      </p>

      <div className="mt-6">
        <ConnectionList connections={connections} status={params.status} />
      </div>
    </div>
  );
}
