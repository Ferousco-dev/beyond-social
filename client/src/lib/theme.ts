/**
 * Theme, stored in a cookie rather than local storage.
 *
 * A cookie is readable while the page is still being rendered, so the server
 * emits the correct class in the first byte. Local storage can only be read
 * after JavaScript runs, which is why theme switchers usually flash the wrong
 * colours for a frame on every load.
 *
 * Nothing here touches `next/headers`, so both the server read in
 * `theme-server.ts` and the browser half in `theme-client.ts` can share it.
 */

export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "bs-theme";

/** A year: a preference this explicit should not quietly expire. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: string | undefined): value is Theme {
  return value !== undefined && (THEMES as readonly string[]).includes(value);
}

/**
 * Applies the theme before first paint, reading the cookie in the browser.
 *
 * Reading the cookie on the server instead would be tidier, but `cookies()` in
 * the root layout opts every page out of static rendering. That measurably cost
 * more than it bought: the marketing pages went from being served off the CDN to
 * server-rendering per request, to decide one class name.
 *
 * A blocking script in `<head>` runs before the body paints, so there is no
 * flash either way. This is the same trick a theme library uses, reading a
 * cookie rather than local storage so the value survives in one place.
 */
export const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):'light';if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;
