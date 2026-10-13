const SHORTCODE = /^[A-Za-z0-9_-]{5,24}$/;

export function instagramEmbedUrl(shortcode: string): string | null {
  return SHORTCODE.test(shortcode) ? `https://www.instagram.com/p/${shortcode}/embed/` : null;
}
