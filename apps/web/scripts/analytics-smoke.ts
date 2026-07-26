/**
 * Behaviour checks for the analytics formatters and derivations.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/analytics-smoke.ts
 */
import {
  emptyDays,
  formatCount,
  platformLabel,
  trendPercent,
  type DailyActivity,
} from "../src/lib/dashboard/analytics";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const day = (date: string, generated: number): DailyActivity => ({ date, generated, ready: 0 });

check("formats thousands", formatCount(12_400) === "12.4K", formatCount(12_400));
check("formats millions", formatCount(2_500_000) === "2.5M", formatCount(2_500_000));
check("leaves small counts alone", formatCount(7) === "7");

check("maps a platform enum to a label", platformLabel("tiktok") === "TikTok");
// An unknown platform must still render something rather than blank.
check("falls back to the raw value", platformLabel("mastodon") === "mastodon");

check(
  "computes a rising trend",
  trendPercent([day("2026-01-01", 10), day("2026-01-02", 15)]) === 50,
);
check(
  "computes a falling trend",
  trendPercent([day("2026-01-01", 10), day("2026-01-02", 5)]) === -50,
);
// Growth from zero is undefined, not infinite, and must not be shown as a number.
check("reports no trend from a zero start", trendPercent([day("a", 0), day("b", 9)]) === undefined);
check("reports no trend for an empty series", trendPercent([]) === undefined);
// A drop to zero is real and must still be reported.
check("reports a drop to zero", trendPercent([day("a", 8), day("b", 0)]) === -100);

const days = emptyDays(7, new Date("2026-03-10T12:00:00Z"));
check("builds a continuous axis", days.length === 7);
check("ends on today", days[6]?.date === "2026-03-10", days[6]?.date);
check("starts six days back", days[0]?.date === "2026-03-04", days[0]?.date);
check(
  "zeroes every day",
  days.every((entry) => entry.generated === 0 && entry.ready === 0),
);

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
