"use server";

import { getLibraryItems, type LibraryCursor, type LibraryPage } from "./queries";

/** Server action wrapper so the client grid can page without a route. */
export async function loadMoreLibraryItems(cursor: LibraryCursor): Promise<LibraryPage> {
  return getLibraryItems(cursor);
}
