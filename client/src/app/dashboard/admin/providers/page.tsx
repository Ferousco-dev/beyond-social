import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ProviderKeyForm } from "@/features/admin-console/components/provider-key-form";
import { EmailFromForm } from "@/features/admin-console/components/email-from-form";
import { emailFromResponse, providersResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

const PROVIDER_GROUPS: ReadonlyArray<{ title: string; hint: string; names: readonly string[] }> = [
  { title: "Video and AI", hint: "Needed to make videos and to run chat, link analysis and captions. These keys are tested when you save them.", names: ["kie", "kie_webhook_hmac", "gemini"] },
  { title: "Finding trends", hint: "Needed for Discover. Tested when you save it.", names: ["apify"] },
  { title: "Payments and email", hint: "Stripe takes payments. Resend sends receipts. The Stripe secret key is tested when you save it.", names: ["stripe_secret_key", "stripe_webhook_secret", "resend_api_key"] },
  { title: "Posting to social accounts", hint: "Each platform turns on once both of its values are set. These are not tested here, so connect an account to check them.", names: ["youtube_client_id", "youtube_client_secret", "tiktok_client_key", "tiktok_client_secret", "meta_app_id", "meta_app_secret"] },
  { title: "Alerts", hint: "Where warnings are sent, such as a provider running low. A test message is sent when you save.", names: ["alert_webhook"] },
];

export const metadata: Metadata = { title: "Admin · Provider keys" };

export default async function AdminProvidersPage(): Promise<ReactNode> {
  const [result, email] = await Promise.all([goApi("/api/v1/admin/providers", providersResponse), goApi("/api/v1/admin/email", emailFromResponse)]);

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
          {PROVIDER_GROUPS.map((group) => {
            const items = result.data.data.credentials.filter((credential) => group.names.includes(credential.name));
            if (items.length === 0) return null;
            return (
              <section key={group.title} className="mt-8">
                <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
                <p className="mt-1 text-xs text-ink-soft">{group.hint}</p>
                <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
                  {items.map((credential) => (
                    <ProviderKeyForm key={credential.name} credential={credential} writable={result.data.data.writable} />
                  ))}
                </ul>
              </section>
            );
          })}
          {email.ok ? <EmailFromForm current={email.data.data.from} fallback={email.data.data.default} /> : null}
        </>
      )}
    </div>
  );
}
