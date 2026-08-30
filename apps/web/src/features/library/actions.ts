"use server";

import { getLibraryItems, type LibraryPage } from "./queries";

/** Server action wrapper so the client grid can page without a route. */
export async function loadMoreLibraryItems(cursor: string): Promise<LibraryPage> {
  return getLibraryItems(cursor);
}
