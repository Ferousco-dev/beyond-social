import { isTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "./theme";

/**
 * The browser half of the theme.
 *
 * Separate from `theme.ts` because that module reads `cookies()` and so cannot
 * be imported into a client component. Both the settings picker and the sidebar
 * toggle need the same two operations, and they must agree: a mismatch would
 * show one control a theme the other had already changed.
 */

/** Reads what the visitor chose, falling back to the documented default. */
export function readTheme(): Theme {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1] ?? "") : undefined;
  return isTheme(value) ? value : "light";
}

/**
 * Applies the theme to the document immediately, without waiting for the server
 * to store it. The cookie is what survives a return visit; this is what makes
 * the click feel instant.
 */
export function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Stores the choice, from the browser rather than from a server action.
 *
 * It used to be written by `saveTheme`, and the cookie did not survive a
 * reload. Middleware runs on every dashboard route and follows the Supabase
 * pattern of replacing the response with a fresh `NextResponse.next()` carrying
 * only the auth cookies, so a `Set-Cookie` from an action posted to the same
 * path had nothing reliable to ride back on. The class flipped instantly, which
 * made it look saved, and the next load found no cookie and fell back to light.
 *
 * Writing it here also removes the router refresh that a cookie-setting action
 * triggers. That refresh remounted the tree while the theme control sat inside
 * an open dropdown, and the dropdown's scroll lock was left behind on a menu
 * that no longer existed, which is why the page could not be scrolled after
 * switching to dark.
 *
 * Safe to do from the browser: this is a display preference, nothing is
 * authorised by it, and `httpOnly` was already false so that the picker could
 * read it back.
 */
export function writeTheme(theme: Theme): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}
