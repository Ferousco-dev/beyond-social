import { type Metadata } from "next";

import { ApiKeyManager } from "@/features/api-keys/components/api-key-manager";
import { PlanLocked } from "@/features/billing/components/plan-locked";
import { callerHasIntegrations } from "@/lib/billing/integration-gate";
import { getApiKeys } from "@/lib/dashboard/api-keys";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const entitled = await callerHasIntegrations();
  // Keys are only read for someone who may use them. Below the plan there is
  // nothing to show and no reason to ask the database for it.
  const keys = entitled ? await getApiKeys() : [];

  return (
    // The page frame and the title come from the settings layout now: the rail
    // names the section on a desktop, the back header names it on a phone.
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        Call the API from your own code. Base URL <code className="text-ink">/api/v1</code>, bearer
        token authentication.
      </p>

      <div className="mt-6">
        {entitled ? (
          <ApiKeyManager keys={keys} />
        ) : (
          <PlanLocked
            title="Call Beyond Social from your own code"
            body="API keys let your own software list generations, read usage, and connect an AI agent over MCP."
          />
        )}
      </div>

      {/* Shown either way. Someone deciding whether to upgrade is entitled to
          see what they would be buying. */}
      <div className="mt-10 rounded-2xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Endpoints</h2>
        <ul className="mt-3 space-y-2 text-xs text-ink-soft">
          <li>
            <code className="text-ink">GET /api/v1/generations</code> · your generations, newest
            first
          </li>
          <li>
            <code className="text-ink">GET /api/v1/usage</code> · AI spend and volume, last 30 days
          </li>
          <li>
            <code className="text-ink">POST /api/mcp</code> · the same data as tools an AI agent can
            call
          </li>
        </ul>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink-soft">
          {`curl https://beyondsocial.app/api/v1/generations \\
  -H "Authorization: Bearer bsk_your_key_here"`}
        </pre>
      </div>
    </section>
  );
}
