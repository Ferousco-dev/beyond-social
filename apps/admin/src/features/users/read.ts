import "server-only";

import { searchUsers } from "./rpc";
import { formatCursor, PAGE_SIZE, parseCursor, type UserPage, type UserQuery } from "./schema";

/**
 * One page of accounts, with the cursor that reaches the next one.
 *
 * A keyset page cannot know a total, and asking for one would mean a count over
 * the whole table on every keystroke. So the page asks for one row more than it
 * shows: if that row comes back there is a next page, and the last visible row
 * is the cursor to it. That is the only extra cost of knowing.
 */
export async function fetchUserPage(query: UserQuery): Promise<UserPage | null> {
  const rows = await searchUsers(query.q, parseCursor(query.cursor), PAGE_SIZE + 1);
  if (!rows) return null;

  const visible = rows.slice(0, PAGE_SIZE);
  const last = visible.at(-1);
  const hasMore = rows.length > PAGE_SIZE && last !== undefined;

  return {
    rows: visible,
    nextCursor: hasMore ? formatCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
