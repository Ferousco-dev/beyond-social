/**
 * Only same-origin paths are followed after sign-in. A destination taken from a
 * query parameter is a well-known footgun, and browsers read `/\host` the same
 * way as `//host`, so both are refused. Returns the fallback for anything else.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
