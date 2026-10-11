import "server-only";

import { getCreditBalance } from "@/lib/credits/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { listModels } from "@/lib/models/catalog";
import { createClient } from "@/lib/supabase/server";
import { getUserTimeZone } from "@/lib/time/user-zone";
import { DEFAULT_TIMEZONE } from "@/lib/time/zone";

import { buildDayAxis, foldDays, foldModels } from "./aggregate";
import { rangeDays, type UsageRangeId } from "./range";
import {
  generationRowSchema,
  modelCallSchema,
  toModelCall,
  toUsageRow,
  type UsageReport,
} from "./types";

function empty(range: UsageRangeId, timeZone: string): UsageReport {
  return {
    rows: [],
    days: foldDays([], buildDayAxis(rangeDays(range), timeZone)),
    models: [],
    calls: [],
    totalCreditsSpent: 0,
    totalCreditsRefunded: 0,
    totalRuns: 0,
    balance: 0,
    timeZone,
    hasData: false,
  };
}

/**
 * Everything the usage page renders, from one pair of reads.
 *
 * The page and the CSV export both call this, so the file a user downloads is
 * the table they were looking at rather than a second query that drifted.
 */
export async function getUsageReport(range: UsageRangeId): Promise<UsageReport> {
  if (!isSupabaseConfigured) return empty(range, DEFAULT_TIMEZONE);

  const days = rangeDays(range);
  const timeZone = await getUserTimeZone();
  const supabase = await createClient();

  const [generations, calls, models, balance] = await Promise.all([
    supabase.rpc("usage_generation_daily", { p_days: days, p_tz: timeZone }),
    supabase.rpc("usage_model_calls", { p_days: days }),
    listModels("video"),
    getCreditBalance(),
  ]);

  if (generations.error !== null) return empty(range, timeZone);

  const parsed = generationRowSchema.array().safeParse(generations.data ?? []);
  if (!parsed.success) return empty(range, timeZone);

  const rows = parsed.data.map(toUsageRow);
  const names = new Map(models.map((model) => [model.id, model.name]));
  const parsedCalls = modelCallSchema.array().safeParse(calls.data ?? []);

  return {
    rows,
    days: foldDays(rows, buildDayAxis(days, timeZone)),
    models: foldModels(rows, names),
    calls: parsedCalls.success ? parsedCalls.data.map(toModelCall) : [],
    totalCreditsSpent: rows.reduce((sum, row) => sum + row.creditsSpent, 0),
    totalCreditsRefunded: rows.reduce((sum, row) => sum + row.creditsRefunded, 0),
    totalRuns: rows.reduce((sum, row) => sum + row.runs, 0),
    balance,
    timeZone,
    hasData: rows.length > 0,
  };
}
