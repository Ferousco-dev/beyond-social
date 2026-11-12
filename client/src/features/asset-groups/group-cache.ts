import type { AssetGroup, AssetGroupDetail } from "@/lib/go-api/schemas";

/**
 * Groups already opened this session. Opening one again paints from here at
 * once and refreshes behind it, so a popup never opens onto a blank.
 */
const cache = new Map<string, AssetGroupDetail>();

export function cachedGroup(id: string): AssetGroupDetail | undefined {
  return cache.get(id);
}

export function rememberGroup(group: AssetGroupDetail): void {
  cache.set(group.id, group);
}

export function forgetGroup(id: string): void {
  cache.delete(id);
}

/** A list row stands in for the detail until the real one arrives. */
export function asDetail(group: AssetGroup): AssetGroupDetail {
  return { ...group, extra_views: [] };
}
