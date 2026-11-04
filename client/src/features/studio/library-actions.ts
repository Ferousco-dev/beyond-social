"use server";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { libraryResponse, type LibraryItem } from "@/lib/go-api/schemas";

/** Finished videos the person made in the app, newest first, for the editor's Media tab. */
export async function listMadeVideos(): Promise<{ readonly ok: true; readonly items: readonly LibraryItem[] } | { readonly ok: false; readonly message: string }> {
  if (!isGoApiConfigured()) return { ok: false, message: "The backend is not connected yet." };
  const result = await goApi("/api/v1/library?limit=100", libraryResponse);
  return result.ok ? { ok: true, items: result.data.data } : { ok: false, message: result.message };
}
