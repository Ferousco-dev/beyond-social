/**
 * Reading Instagram post URLs.
 *
 * Same discipline as the TikTok module beside it: these ids come from a scraper
 * reading pages we do not control and end up in an iframe `src`, so nothing is
 * passed through. The shortcode is validated and the URL is composed here.
 */

/**
 * Instagram shortcodes are base64url over the post id. Eleven is the length in
 * practice, but the id is a counter and the encoding grows with it, so the bound
 * is a sanity check rather than a format claim.
 */
const SHORTCODE = /^[A-Za-z0-9_-]{5,24}$/;

/**
 * Instagram's own embed for a post.
 *
 * Null for anything that is not a plausible shortcode, which is the caller's
 * signal to show the poster frame instead. Unlike TikTok's player this one is
 * served without a token but is not guaranteed: Instagram blocks the embed for
 * private and some age-restricted accounts, and the card is built to fall back
 * rather than to show an empty frame.
 *
 * `/p/` rather than `/reel/`. It is the canonical path for every post type and
 * it is what the scraper returns even for reels, so building `/reel/` meant
 * composing a URL that did not match the one the post was found at.
 */
export function instagramEmbedUrl(shortcode: string): string | null {
  return SHORTCODE.test(shortcode) ? `https://www.instagram.com/p/${shortcode}/embed/` : null;
}
