/**
 * Whether a user-supplied webhook URL is safe for us to call.
 *
 * This is the same problem `supabase/functions/_shared/fetch-guard.ts` solves
 * for render callbacks, and the deny-by-class rules are deliberately the same:
 * https only, no credentials, no loopback, private, link-local or CGNAT space.
 * A webhook URL is arguably the sharper version of it, because here the address
 * is typed in by whoever wants us to fetch it, rather than handed to us by a
 * provider we chose.
 *
 * Two things this adds over that file, both because the input is attacker-
 * chosen rather than vendor-chosen:
 *
 *   1. Alternate IPv4 spellings. `https://2130706433` and `https://0177.0.0.1`
 *      both reach 127.0.0.1, and a string match on "127." misses both.
 *   2. A reason string, so the form can say what is wrong instead of "invalid".
 *
 * What it deliberately does not claim to do: stop DNS rebinding. A hostname
 * that resolves to a public address now can resolve to 169.254.169.254 by the
 * time a request is actually made. Validating here is necessary and not
 * sufficient; the sender, when it ships, must re-check the resolved address at
 * connect time.
 */

const PRIVATE_V4 =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

export type WebhookUrlError =
  "malformed" | "not_https" | "has_credentials" | "private_host" | "too_long";

export type WebhookUrlCheck =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly reason: WebhookUrlError };

export const WEBHOOK_URL_MESSAGES: Readonly<Record<WebhookUrlError, string>> = {
  malformed: "That is not a valid URL.",
  not_https: "The URL must start with https://. Plain http can be read in transit.",
  has_credentials: "Remove the username and password from the URL. Use the signing secret instead.",
  private_host:
    "That address is on a private or internal network, which we cannot reach and will not call.",
  too_long: "That URL is too long.",
};

/**
 * Rewrites the numeric spellings of an IPv4 address into dotted-quad form so a
 * single set of range checks covers all of them. Returns the host unchanged
 * when it is not a bare number, which includes every real hostname.
 */
function normaliseNumericHost(host: string): string {
  // A single integer, e.g. 2130706433 for 127.0.0.1.
  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return host;
    return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
  }

  // Dotted form with octal or hexadecimal parts, e.g. 0177.0.0.1.
  const parts = host.split(".");
  if (parts.length !== 4) return host;
  const bytes = parts.map((part) => {
    if (/^0x[\da-f]+$/i.test(part)) return Number.parseInt(part, 16);
    if (/^0[0-7]+$/.test(part)) return Number.parseInt(part, 8);
    if (/^\d+$/.test(part)) return Number.parseInt(part, 10);
    return Number.NaN;
  });
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return host;
  return bytes.join(".");
}

function isPrivateHost(rawHost: string): boolean {
  const host = normaliseNumericHost(rawHost.toLowerCase());

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal"))
    return true;
  if (host.endsWith(".local") || host.endsWith(".home.arpa")) return true;

  if (PRIVATE_V4.test(host)) return true;

  const v6 = host.replace(/^\[|\]$/g, "");
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;

  // IPv4-mapped IPv6, which reaches the v4 address it embeds. `URL` rewrites
  // the readable spelling into hex groups, so `::ffff:127.0.0.1` arrives here
  // as `::ffff:7f00:1` and a check for the dotted form alone never fires.
  if (v6.startsWith("::ffff:")) {
    const mapped = v6.slice(7);
    const hexGroups = /^([\da-f]{1,4}):([\da-f]{1,4})$/.exec(mapped);
    if (hexGroups) {
      const high = Number.parseInt(hexGroups[1] ?? "", 16);
      const low = Number.parseInt(hexGroups[2] ?? "", 16);
      return isPrivateHost(
        [high >> 8, high & 0xff, low >> 8, low & 0xff].map((byte) => byte & 0xff).join("."),
      );
    }
    return isPrivateHost(mapped);
  }

  return false;
}

/** Validates a webhook URL, returning the normalised form or a reason it failed. */
export function checkWebhookUrl(raw: string): WebhookUrlCheck {
  const trimmed = raw.trim();
  if (trimmed.length > 2048) return { ok: false, reason: "too_long" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (url.protocol !== "https:") return { ok: false, reason: "not_https" };
  if (url.username !== "" || url.password !== "") return { ok: false, reason: "has_credentials" };
  if (url.hostname === "") return { ok: false, reason: "malformed" };
  if (isPrivateHost(url.hostname)) return { ok: false, reason: "private_host" };

  // Fragments are never sent over the wire, so keeping one would show the user
  // a stored URL that differs from the one we would call.
  url.hash = "";
  return { ok: true, url: url.toString() };
}
