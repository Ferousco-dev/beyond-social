// Authenticated endpoint: issues a HeyGen-hosted consent URL for an existing
// digital twin group. This is the self-service path; it deliberately never
// sends `consent_video`, because uploading prerecorded consent is Enterprise-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { adminClient } from "../_shared/credits.ts";
import { createHostedConsent, isHeygenConfigured } from "../_shared/heygen.ts";
import { json, serve } from "../_shared/http.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

interface Body {
  avatarId?: string;
  rerouteUrl?: string;
}

interface AvatarRow {
  id: string;
  user_id: string;
  provider_avatar_id: string | null;
  training_status: string;
}

function validRerouteUrl(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (raw === "") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.hostname === "localhost" ? url.toString() : null;
  } catch {
    return null;
  }
}

serve(async (request) => {
  const traceId = traceIdFrom(request);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization) return json({ error: "unauthorized" }, 401);
  if (!isHeygenConfigured()) return json({ error: "provider_unconfigured" }, 503);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as Body;
  const admin = adminClient();
  let query = admin
    .from("heygen_avatars")
    .select("id, user_id, provider_avatar_id, training_status")
    .eq("user_id", user.id)
    .not("provider_avatar_id", "is", null);

  if ((body.avatarId ?? "").trim() !== "") {
    query = query.eq("id", body.avatarId!.trim());
  } else {
    query = query
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(1);
  if (error) {
    log("error", "could not find avatar for hosted consent", { traceId, error: error.message });
    return json({ error: "lookup_failed" }, 500);
  }

  const row = ((data ?? []) as AvatarRow[])[0] ?? null;
  if (!row?.provider_avatar_id) return json({ error: "avatar_not_found" }, 404);

  try {
    const consent = await createHostedConsent(
      row.provider_avatar_id,
      validRerouteUrl(body.rerouteUrl),
      `${row.id}:hosted-consent:${crypto.randomUUID()}`,
    );
    const expiresAt = consent.url ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    await admin
      .from("heygen_avatars")
      .update({
        provider_consent_status: consent.consentStatus,
        provider_consent_url: consent.url,
        provider_consent_url_expires_at: expiresAt,
        provider_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", user.id);

    return json({ avatarId: row.id, consentUrl: consent.url, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "could not create hosted consent", { traceId, error: message });
    return json({ error: "consent_failed", detail: message.slice(0, 500) }, 502);
  }
});
