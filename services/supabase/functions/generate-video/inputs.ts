// What the caller attached, handed to the provider.
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handToProvider } from "../_shared/reference.ts";

/**
 * Reference material goes to kie as bytes rather than as links to our own
 * storage.
 *
 * The bytes are read through the client here, which talks to storage over the
 * platform's internal network, so this works regardless of whether our storage
 * is reachable from the public internet. That is the whole point: passing a
 * signed link meant kie had to fetch us, and in local development that link is
 * a 127.0.0.1 address pointing at kie's own loopback.
 *
 * Paths, not URLs, for the same reason the thread stores paths: a signed URL is
 * a fact that expires.
 */
export async function handStillsOver(
  supabase: SupabaseClient,
  attached: { paths?: string[]; urls?: string[] },
  /** Nullable, not optional: `traceIdFrom` returns null when there is no header. */
  traceId: string | null,
): Promise<string[] | undefined> {
  const paths = attached.paths?.slice(0, 2);
  if (!paths || paths.length === 0) {
    // Nothing was uploaded through the composer, so whatever the caller sent is
    // already a URL kie can reach.
    return attached.urls?.slice(0, 2);
  }

  const urls: string[] = [];
  for (const path of paths) {
    urls.push(await handToProvider(supabase, "uploads", path, traceId));
  }
  return urls;
}

/**
 * Footage the run edits or copies motion from, handed over the same way the
 * stills are. A separate bucket from the photos, because video has a different
 * size ceiling and a different set of allowed types.
 */
export async function handFootageOver(
  supabase: SupabaseClient,
  paths: string[] | undefined,
  /** Nullable, not optional: `traceIdFrom` returns null when there is no header. */
  traceId: string | null,
): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths?.slice(0, 1) ?? []) {
    urls.push(await handToProvider(supabase, "video-uploads", path, traceId));
  }
  return urls;
}
