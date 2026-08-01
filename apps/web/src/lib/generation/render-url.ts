import "server-only";

import { logger } from "@/lib/logger";

/**
 * Turning a stored render into something playable.
 *
 * The `renders` bucket used to be public, so the finished URL was stored on the
 * row and handed out forever. That meant every generated video was readable by
 * anyone holding the link, with no session and no check. The ids are UUIDs so
 * they were not guessable, but unlisted is not private, and this is a product
 * where the video is somebody's face and voice.
 *
 * The bucket is private now, so the path is the durable fact and the link is
 * minted per read. Same reasoning as message attachments, and the same shape.
 */

/**
 * Structural, so both the request-scoped client and the service client can
 * sign. They are different generated types and neither is a subtype of the
 * other, but signing only needs this much of either.
 */
interface Signer {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      createSignedUrls(
        paths: string[],
        expiresIn: number,
      ): Promise<{
        data: { path: string | null; signedUrl: string | null }[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

/**
 * Long enough to watch a video, short enough that a leaked link is not a
 * permanent one. Deliberately shorter than the attachment TTL: a render can be
 * re-signed on the next page load, where a provider fetching a reference image
 * gets one chance.
 */
export const RENDER_URL_TTL_SECONDS = 60 * 60;

/**
 * Signs one render path.
 *
 * Returns null rather than throwing. A thread with one unreadable video should
 * render the rest, and the caller shows a video that will not play the same way
 * it shows one that is still rendering.
 */
export async function signRender(
  supabase: Signer,
  path: string | null,
  ttlSeconds: number = RENDER_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage.from("renders").createSignedUrl(path, ttlSeconds);
  if (error !== null || !data?.signedUrl) {
    logger.warn("could not sign a render", { error: error?.message });
    return null;
  }
  return data.signedUrl;
}

/**
 * Signs many paths in one call, returning path to url.
 *
 * Batched because a thread signs every finished draft it shows, and doing that
 * one request at a time put a round trip in front of each video.
 */
export async function signRenders(
  supabase: Signer,
  paths: readonly (string | null)[],
  ttlSeconds: number = RENDER_URL_TTL_SECONDS,
): Promise<ReadonlyMap<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from("renders")
    .createSignedUrls(unique, ttlSeconds);
  if (error !== null || data === null) {
    logger.warn("could not sign renders", { error: error?.message, count: unique.length });
    return new Map();
  }

  // A failure comes back in the array with a null `signedUrl` rather than being
  // omitted, so the response is read by path and both fields are checked. Typing
  // `signedUrl` as a plain string here is what blanked every attachment in a
  // thread when one object was missing.
  return new Map(
    data
      .filter(
        (row): row is { path: string; signedUrl: string } =>
          typeof row.path === "string" && typeof row.signedUrl === "string",
      )
      .map((row) => [row.path, row.signedUrl]),
  );
}
