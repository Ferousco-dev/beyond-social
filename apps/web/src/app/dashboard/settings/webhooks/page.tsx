import { Info } from "lucide-react";
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

      {/* The sender does not exist yet. Saying so here is the difference between
          a feature that is not finished and a feature that looks broken: without
          this, a correctly registered endpoint that never receives anything
          reads as a bug worth filing. */}
      <div
        role="note"
        className="mt-5 flex items-start gap-2.5 rounded-xl border border-hairline bg-cloud p-4"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
        <p className="text-xs leading-relaxed text-ink-soft">
          <strong className="font-medium text-ink">Deliveries are not being sent yet.</strong> You
          can register endpoints and secrets now, and they will start receiving events as soon as
          the delivery service ships. Nothing will arrive at your URL before then, so an endpoint
          that stays quiet is not misconfigured.
        </p>
      </div>

      <div className="mt-6">
        {entitled ? (
          <WebhookManager webhooks={webhooks} />
        ) : (
          <PlanLocked
            title="Be told when something finishes"
            body="A signed HTTPS request arrives at your endpoint the moment a video renders or a post goes live, so your own systems do not have to poll for it."
          />
        )}
      </div>

      <div className="mt-10">
        <SignatureDoc />
      </div>
    </section>
  );
}
