import { type UsageDay, type UsageModel, type UsageRow } from "./types";

const DAY_MS = 86_400_000;

/**
 * The last `days` calendar dates in `timeZone`, oldest first, as `YYYY-MM-DD`.
 *
 * Stepping by 24h from a wall clock would drop or repeat a date across a DST
 * boundary, so today's local date is resolved once and then walked backwards as
 * pure calendar arithmetic, which has no offsets in it to get wrong.
 */
export function buildDayAxis(days: number, timeZone: string, now = new Date()): readonly string[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // `en-CA` is ISO-shaped, so the formatted date parses as a UTC midnight and
  // the walk backwards is plain integer arithmetic.
  const today = Date.parse(`${formatter.format(now)}T00:00:00Z`);

  return Array.from({ length: days }, (_, index) =>
    new Date(today - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
  );
}

/** One bar per day in range. Days with no runs stay in the axis at zero so the shape of a gap is visible. */
export function foldDays(rows: readonly UsageRow[], axis: readonly string[]): readonly UsageDay[] {
  const byDay = new Map<string, { runs: number; netCredits: number }>();
  for (const row of rows) {
    const entry = byDay.get(row.day) ?? { runs: 0, netCredits: 0 };
    entry.runs += row.runs;
    entry.netCredits += row.creditsSpent - row.creditsRefunded;
    byDay.set(row.day, entry);
  }

  return axis.map((day) => ({
    day,
    runs: byDay.get(day)?.runs ?? 0,
    netCredits: byDay.get(day)?.netCredits ?? 0,
  }));
}

/**
 * The breakdown beneath the chart. `names` comes from the catalogue; a model
 * that is no longer listed falls back to its id rather than to a guess.
 */
export function foldModels(
  rows: readonly UsageRow[],
  names: ReadonlyMap<string, string>,
): readonly UsageModel[] {
  const byModel = new Map<string, UsageModel>();
  for (const row of rows) {
    const current = byModel.get(row.model) ?? {
      model: row.model,
      name: names.get(row.model) ?? row.model,
      runs: 0,
      succeeded: 0,
      failed: 0,
      creditsSpent: 0,
      creditsRefunded: 0,
    };
    byModel.set(row.model, {
      ...current,
      runs: current.runs + row.runs,
      succeeded: current.succeeded + row.succeeded,
      failed: current.failed + row.failed,
      creditsSpent: current.creditsSpent + row.creditsSpent,
      creditsRefunded: current.creditsRefunded + row.creditsRefunded,
    });
  }

  // Sorted by credits actually kept, which is the column the table totals, so
  // a model whose runs were all refunded does not lead the list.
  const net = (model: UsageModel): number => model.creditsSpent - model.creditsRefunded;
  return [...byModel.values()].sort(
    (a, b) => net(b) - net(a) || b.runs - a.runs || a.model.localeCompare(b.model),
  );
}
