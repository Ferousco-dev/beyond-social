import "server-only";

import { cookies } from "next/headers";

import { isTheme, THEME_COOKIE, type Theme } from "./theme";

/**
 * Reading the stored theme on the server.
 *
 * Deliberately its own module: importing `next/headers` from `theme.ts` would
 * pull it into every client component that needs the type or the cookie name,
 * which the bundler rejects outright.
 *
 * Only pages that render a theme control should call this. Reading it in the root
 * layout opts the whole app out of static rendering, which is why the pre-paint
 * class comes from `THEME_SCRIPT` instead.
 */

/** Light unless the visitor has chosen otherwise. */
export async function getTheme(): Promise<Theme> {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(stored) ? stored : "light";
}
