const DAY_LABEL = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  // The value is already a calendar date in the reader's zone, so it is read
  // back at UTC noon: re-applying a zone here would slide labels by a day.
  timeZone: "UTC",
});

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatDayLabel(day: string | undefined): string {
  if (day === undefined) return "";
  return DAY_LABEL.format(new Date(`${day}T12:00:00Z`));
}

export function formatCompact(value: number): string {
  return COMPACT.format(value);
}

export function formatCredits(value: number): string {
  return value.toLocaleString("en");
}
