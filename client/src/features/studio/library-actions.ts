"use server";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { libraryResponse, type LibraryItem } from "@/lib/go-api/schemas";

/** Finished videos the person made in the app, newest first, for the editor's Media tab (the latest five only). */
export async function listMadeVideos(): Promise<{ readonly ok: true; readonly items: readonly LibraryItem[] } | { readonly ok: false; readonly message: string }> {
  if (!isGoApiConfigured()) return { ok: false, message: "The service is not available right now. Try again in a few minutes." };
  const result = await goApi("/api/v1/library?limit=5", libraryResponse);
  return result.ok ? { ok: true, items: result.data.data } : { ok: false, message: result.message };
}
