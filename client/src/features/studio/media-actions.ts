"use server";

import { z } from "zod";

import { attachmentUrl } from "@/features/conversation/media-actions";

const idsSchema = z.array(z.string().uuid()).max(100);

/** Short-lived playable links for the user's uploaded files, by id. Files that cannot be read are left out. */
export async function resolveMediaUrls(ids: readonly string[]): Promise<Record<string, string>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return {};
  const entries = await Promise.all(parsed.data.map(async (id) => [id, await attachmentUrl(id)] as const));
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1] !== null));
}
