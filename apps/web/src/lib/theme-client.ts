import { isTheme, THEME_COOKIE, type Theme } from "./theme";

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
