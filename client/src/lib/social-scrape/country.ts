import "server-only";

import { headers } from "next/headers";

/**
 * Which country a Discover search should run from.
 *
 * Searching "Nigeria" from Nigeria was returning diaspora content about
 * Nigeria rather than what is actually trending there, because the TikTok
 * actor's search has no geographic signal by default. Its `proxyCountryCode`
 * field is the real lever: it routes the scrape through a proxy in that
 * country, which is what biases TikTok's own regional ranking.
 *
 * Read from Vercel's `x-vercel-ip-country` header rather than
 * `navigator.geolocation`. It needs no browser permission prompt, no
 * reverse-geocoding step to turn coordinates into a country code, and it is
 * already there on every request this app serves in production.
 */

/** Vercel's own placeholder when it cannot determine a visitor's country. */
const UNKNOWN = "XX";

const ISO_3166_ALPHA_2 = /^[A-Z]{2}$/;

/**
 * `null` outside Vercel's edge (local dev, a request that reaches the app
 * some other way) or when Vercel itself could not tell. Both cases fall back
 * to today's behaviour: an unbiased, global search.
 */
export async function resolveCountryCode(): Promise<string | null> {
  const country = (await headers()).get("x-vercel-ip-country");
  if (!country || country === UNKNOWN || !ISO_3166_ALPHA_2.test(country)) return null;
  return country;
}
