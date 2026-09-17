"use server";

import { searchUsers, type UserSearchCursor, type UserSearchResult } from "@/lib/dashboard/admin";

/**
 * Read-only wrapper so the debounced search box, a client component, can reach
 * the admin-gated RPC. The gate is still enforced in the database.
 */
export async function searchUsersAction(
  query: string,
  cursor: UserSearchCursor | null,
  plan?: string,
): Promise<UserSearchResult> {
  return searchUsers(query, cursor, 25, plan);
}
