import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getUserTimeZone } from "@/lib/time/user-zone";

import { zonedDayRange } from "./day-range";
import {
  readAiCalls,
  readApiKeyEvents,
  readGenerations,
  readPublishes,
  type SourceReader,
} from "./sources";
import { PAGE_SIZE, type LogFilter, type LogKind, type LogPage } from "./types";

const READERS: Readonly<Record<LogKind, SourceReader>> = {
  generation: readGenerations,
  publish: readPublishes,
  ai: readAiCalls,
  api_key: readApiKeyEvents,
};

/**
 * The caller's activity, newest first, merged across four tables.
 *
 * The pagination is a k-way merge, not four independent paginations. To answer
 * page N correctly, each source has to offer up everything that could appear at
 * or above the cut, which is `offset + PAGE_SIZE` rows: a source whose rows are
 * all recent can legitimately fill the whole page. Taking one extra row per
 * source is what distinguishes "there is more" from "that was everything"
 * without a second query.
 *
 * This is the honest cost of not having a union view in SQL. It is bounded by
 * MAX_PAGE, and the day filter, which is the way anyone actually navigates a
 * long log, cuts it down to the rows from a single day.
 */
export async function getLogPage(filter: LogFilter): Promise<LogPage> {
  if (!isSupabaseConfigured) return { entries: [], hasMore: false, page: filter.page };

  const timeZone = await getUserTimeZone();
  const range = filter.day ? zonedDayRange(filter.day, timeZone) : null;

  const supabase = await createClient();
  const offset = (filter.page - 1) * PAGE_SIZE;
  const take = offset + PAGE_SIZE + 1;

  const kinds: readonly LogKind[] = filter.kind
    ? [filter.kind]
    : (Object.keys(READERS) as LogKind[]);
  const batches = await Promise.all(kinds.map((kind) => READERS[kind](supabase, range, take)));

  const merged = batches
    .flat()
    .sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : b.at.localeCompare(a.at)));

  return {
    entries: merged.slice(offset, offset + PAGE_SIZE),
    hasMore: merged.length > offset + PAGE_SIZE,
    page: filter.page,
  };
}
