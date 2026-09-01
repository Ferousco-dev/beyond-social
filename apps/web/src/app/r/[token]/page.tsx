import { type Metadata } from "next";

import { PhoneRecorder } from "@/features/live-avatar/components/phone-recorder";
import { hashHandoffToken, looksLikeHandoffToken } from "@/features/live-avatar/handoff";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Record your avatar" };
export const dynamic = "force-dynamic";

/**
 * The page a phone lands on after scanning the handoff QR.
 *
 * Deliberately short and outside the dashboard: this device has no session, the
 * person holding it is standing up with a phone at arm's length, and everything
 * a signed-in shell offers here would be a navigation option they cannot use.
 *
 * The link is checked before anything renders, so an expired or spent code says
 * so on arrival rather than after somebody has recorded a minute of themselves.
 */
export default async function HandoffRecordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let valid = false;
  if (isSupabaseConfigured && looksLikeHandoffToken(token)) {
    const { data } = await createServiceClient().rpc("resolve_avatar_handoff", {
      p_token_hash: hashHandoffToken(token),
    });
    valid = ((data as { user_id: string }[] | null) ?? []).length > 0;
  }

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-ink">This link is no longer good</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Recording links last twenty minutes and work once. Go back to the computer you started on
          and get a new one.
        </p>
      </main>
    );
  }

  // The token reaches the client because the upload endpoints are what enforce
  // it; it is a capability the holder of this page already has by definition.
  return <PhoneRecorder token={token} />;
}
