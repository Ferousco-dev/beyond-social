import { cookies } from "next/headers";

/**
 * Theme, stored in a cookie rather than local storage.
 *
 * A cookie is readable while the page is still being rendered, so the server
 * emits the correct class in the first byte. Local storage can only be read
 * after JavaScript runs, which is why theme switchers usually flash the wrong
 * colours for a frame on every load.
 */

export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "bs-theme";

/** A year: a preference this explicit should not quietly expire. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: string | undefined): value is Theme {
  return value !== undefined && (THEMES as readonly string[]).includes(value);
}

/** Light unless the visitor has chosen otherwise. */
export async function getTheme(): Promise<Theme> {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(stored) ? stored : "light";
}

/**
 * Runs before first paint when the choice is `auto`, so the system preference is
 * applied without a flash. Only needed for `auto`: the explicit choices are
 * already on the server-rendered html element.
 */
export const AUTO_THEME_SCRIPT = `try{if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}`;
