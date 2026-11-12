"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { mediaLinksResponse } from "@/lib/go-api/schemas";

const idsSchema = z.array(z.string().uuid()).min(1).max(100);

export interface MediaLink {
  readonly url: string;
  /** When the link stops working, in milliseconds since the epoch. */
  readonly expiresAt: number;
}

/**
 * Playable links for the user's uploaded files, by id, in ONE request however
 * many files there are. Files that cannot be read are left out.
 */
export async function resolveMediaUrls(ids: readonly string[]): Promise<Record<string, MediaLink>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return {};
  const result = await goApi("/api/v1/media/urls", mediaLinksResponse, { method: "POST", body: { ids: parsed.data } });
  if (!result.ok) return {};
  return Object.fromEntries(Object.entries(result.data.data).map(([id, link]) => [id, { url: link.url, expiresAt: Date.parse(link.expires_at) }]));
}
