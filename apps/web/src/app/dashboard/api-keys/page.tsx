import { type Metadata } from "next";

import { ApiKeyManager } from "@/features/api-keys/components/api-key-manager";
import { getApiKeys } from "@/lib/dashboard/api-keys";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const keys = await getApiKeys();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">API keys</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Call the API from your own code. Base URL <code className="text-ink">/api/v1</code>, bearer
        token authentication.
      </p>

      <div className="mt-6">
        <ApiKeyManager keys={keys} />
      </div>

      <section className="mt-10 rounded-2xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Endpoints</h2>
        <ul className="mt-3 space-y-2 text-xs text-ink-soft">
          <li>
            <code className="text-ink">GET /api/v1/generations</code> · your generations, newest
            first
          </li>
          <li>
            <code className="text-ink">GET /api/v1/usage</code> · AI spend and volume, last 30 days
          </li>
        </ul>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-canvas p-3 text-[11px] text-ink-soft">
          {`curl https://beyondsocial.app/api/v1/generations \\
  -H "Authorization: Bearer bsk_your_key_here"`}
        </pre>
      </section>
    </div>
  );
}
