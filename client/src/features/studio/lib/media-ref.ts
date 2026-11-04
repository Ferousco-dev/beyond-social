const PREFIX = "media:";

/** An uploaded file is referred to as "media:<id>"; anything else is already an address. */
export const mediaRef = (id: string): string => `${PREFIX}${id}`;
export const mediaId = (src: string): string | null => (src.startsWith(PREFIX) ? src.slice(PREFIX.length) : null);

/** The address to load a source from, or "" while its link is still being fetched. */
export function resolveSrc(src: string, urls: Readonly<Record<string, string>>): string {
  const id = mediaId(src);
  if (id !== null) return urls[id] ?? "";
  // Built-in sounds ("lib:...") are made in the browser and filed under their full reference.
  return src.startsWith("lib:") ? (urls[src] ?? "") : src;
}
