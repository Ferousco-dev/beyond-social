import { type Metadata } from "next";

import { PlanLocked } from "@/features/billing/components/plan-locked";
import { callerHasIntegrations } from "@/lib/billing/integration-gate";
import { SignatureDoc } from "@/features/webhooks/components/signature-doc";
import { WebhookManager } from "@/features/webhooks/components/webhook-manager";
import { getWebhooks } from "@/lib/webhooks/queries";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const entitled = await callerHasIntegrations();
  // Nothing to list for someone who cannot register one, and no reason to ask.
  const webhooks = entitled ? await getWebhooks() : [];

  return (
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        Get a signed HTTPS request when something finishes, instead of polling the API for it.
      </p>

      {/* Which events actually fire today. The post events can be subscribed to
          and will not arrive until scheduled publishing runs somewhere, and an
          endpoint that stays quiet is otherwise indistinguishable from a bug. */}
      <p className="mt-2 text-xs text-ink-soft">
        <span className="font-medium text-ink">generation.completed</span> and{" "}
        <span className="font-medium text-ink">generation.failed</span> are being sent now. The post
        events start arriving when scheduled publishing goes live.
      </p>

      <div className="mt-6">
        {entitled ? (
          <WebhookManager webhooks={webhooks} />
        ) : (
          <PlanLocked
            title="Be told when something finishes"
            body="A signed HTTPS request arrives at your endpoint the moment a video finishes rendering, so your own systems do not have to poll for it."
          />
        )}
      </div>

      <div className="mt-10">
        <SignatureDoc />
      </div>
    </section>
  );
}
