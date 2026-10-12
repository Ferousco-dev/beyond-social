import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ProviderKeyForm } from "@/features/admin-console/components/provider-key-form";
import { providersResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Provider keys" };

export default async function AdminProvidersPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/providers", providersResponse);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Provider keys</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Paste a key and it is tested, then stored encrypted. It is never shown again, and it takes effect
        straight away.
      </p>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{result.message}</p>
      ) : (
        <>
          {!result.data.data.writable ? (
            <p className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-ink-soft">
              Saving keys here is switched off until APP_ENCRYPTION_KEY is set on the server.
            </p>
          ) : null}
          <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {result.data.data.credentials.map((credential) => (
              <ProviderKeyForm key={credential.name} credential={credential} writable={result.data.data.writable} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
