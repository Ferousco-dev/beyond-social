import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ConnectionRow } from "@/features/connections/connection-row";
import { goApi } from "@/lib/go-api/client";
import { socialListResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Connections" };
export const dynamic = "force-dynamic";

const OUTCOMES: Readonly<Record<string, string>> = {
  connected: "Account connected.",
  denied: "You chose not to connect that account.",
  failed: "That sign-in did not finish. Please try again.",
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<ReactNode> {
  const { status } = await searchParams;
  const result = await goApi("/api/v1/social", socialListResponse);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Connections</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Connect the accounts you want the assistant to post to. You approve every post before it goes out.
      </p>

      {status && OUTCOMES[status] ? (
        <p role="status" className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-ink">
          {OUTCOMES[status]}
        </p>
      ) : null}

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.message}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {result.data.data.map((item) => (
            <ConnectionRow key={item.platform} status={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
