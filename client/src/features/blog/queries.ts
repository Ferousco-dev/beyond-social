import "server-only";

import { env } from "@/lib/env";
import { blogListResponse, blogResponse, type GoBlogPost } from "@/lib/go-api/schemas";

/**
 * Public blog reads against the Go API. No login: these endpoints are
 * anonymous by design. A down backend degrades to empty, never a 500 page.
 */

function base(): string {
  return env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

async function read<T>(path: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): Promise<T | null> {
  if (base() === "") return null;
  try {
    const response = await fetch(`${base()}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    const parsed = schema.safeParse(await response.json().catch(() => null));
    return parsed.success && parsed.data ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getPublishedPosts(limit = 20): Promise<readonly GoBlogPost[]> {
  const result = await read(`/api/v1/blog?limit=${limit}`, blogListResponse);
  return result?.data ?? [];
}

export async function getPublishedPost(slug: string): Promise<GoBlogPost | null> {
  const result = await read(`/api/v1/blog/${encodeURIComponent(slug)}`, blogResponse);
  return result?.data ?? null;
}
