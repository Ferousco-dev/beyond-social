/**
 * Guards for fetching a URL that arrived from outside.
 *
 * The render callback hands us a URL and we fetch it with the service role, then
 * store the bytes in a public bucket. That is three separate problems if the URL
 * is not checked:
 *
 *   1. Server-side request forgery. A URL pointing at 169.254.169.254 or
 *      127.0.0.1 makes this function fetch the platform's own metadata and
 *      internal services from inside the network boundary.
 *   2. Memory exhaustion. The body is buffered whole, so a large response takes
 *      the function down rather than merely failing.
 *   3. Arbitrary content hosting. Whatever comes back is uploaded to a public
 *      bucket on our domain, which turns a stolen webhook secret into a way to
 *      serve malware or a phishing page from a URL people have reason to trust.
 *
 * The callback is authenticated by a shared secret, but that secret travels in a
 * query string because the provider decides what it sends, and query strings end
 * up in proxy logs and referrers. These checks are what stands behind it.
 */

/** Result renders are video files; anything much larger is not one. */
export const MAX_RENDER_BYTES = 200 * 1024 * 1024;

const PRIVATE_V4 =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

/**
 * Whether a URL is safe to fetch from inside our infrastructure.
 *
 * Denies by class rather than by allowlist, because the provider's result hosts
 * are not documented anywhere we control and an allowlist we guessed at would
 * break real renders. Set `RENDER_HOST_ALLOWLIST` to a comma-separated list of
 * hostnames to narrow it further once the real ones are known.
 */
export function isSafeRenderUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  // Only https. http is both eavesdroppable and the easy path to an internal
  // service that does not speak TLS.
  if (url.protocol !== "https:") return false;

  // Credentials in a URL are never legitimate here and confuse host parsing.
  if (url.username !== "" || url.password !== "") return false;

  const host = url.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return false;
  }

  // IPv4 literals in private, loopback, link-local and carrier-grade NAT space.
  if (PRIVATE_V4.test(host)) return false;

  // IPv6 loopback and unique-local, in bracketed or bare form.
  const v6 = host.replace(/^\[|\]$/g, "");
  if (v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) {
    return false;
  }

  const allowlist = (Deno.env.get("RENDER_HOST_ALLOWLIST") ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return false;
  }

  return true;
}

/**
 * Reads a response body up to a limit, refusing rather than truncating.
 *
 * A truncated video that looks successful is worse than a failed copy: the
 * failure path already falls back to the provider URL, which still plays.
 */
export async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;

  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    // Cancelling matters: without it the connection stays open, still streaming
    // the bytes we have already decided not to keep.
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
