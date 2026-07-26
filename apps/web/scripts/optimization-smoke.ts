/**
 * Behaviour checks for posting-time suggestions and hashtag formatting.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/optimization-smoke.ts
 */
import { formatHashtags } from "../src/lib/optimization/captions";
import {
  PLATFORM_WINDOWS,
  suggestPostingTimes,
  toLocalInputValue,
} from "../src/lib/optimization/posting-times";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

// Hashtags: platforms silently drop malformed tags, so they are cleaned here.
check("adds a missing hash", formatHashtags(["fashion"]) === "#fashion");
check("does not double the hash", formatHashtags(["#fashion"]) === "#fashion");
check("strips spaces", formatHashtags(["get ready with me"]) === "#getreadywithme");
check("strips punctuation", formatHashtags(["day-1!"]) === "#day1");
check("keeps underscores", formatHashtags(["get_ready"]) === "#get_ready");
check("keeps non-latin scripts", formatHashtags(["日本"]) === "#日本");
check(
  "deduplicates case-insensitively",
  formatHashtags(["Fashion", "fashion", "#FASHION"]) === "#Fashion",
);
check("drops tags that reduce to nothing", formatHashtags(["!!!", "ok"]) === "#ok");
check("joins with spaces", formatHashtags(["a", "b"]) === "#a #b");
check("handles an empty list", formatHashtags([]) === "");

// A suggestion in the past looks like the tool did not notice what time it is.
{
  // Late evening, so today's windows are all behind us.
  const now = new Date("2026-03-10T23:30:00");
  const times = suggestPostingTimes("tiktok", now, 3);
  check("returns the requested count", times.length === 3, String(times.length));
  check(
    "never suggests a past slot",
    times.every((slot) => new Date(slot.value).getTime() > now.getTime()),
    times.map((t) => t.value).join(", "),
  );
  check(
    "rolls over to the next day",
    times[0]?.value.startsWith("2026-03-11") ?? false,
    times[0]?.value ?? "",
  );
  check("slots are in ascending order", times[0]!.value < times[1]!.value);
  check(
    "every slot has a reason",
    times.every((slot) => slot.reason.length > 0),
  );
}

// A slot only minutes away is not useful, so it is skipped.
{
  const now = new Date("2026-03-10T10:55:00");
  const times = suggestPostingTimes("tiktok", now, 1);
  check(
    "skips a slot with no lead time",
    times[0]?.value !== "2026-03-10T11:00",
    times[0]?.value ?? "",
  );
}

// Each platform has its own window, or the "recommendation" means nothing.
{
  const now = new Date("2026-03-10T00:01:00");
  const tiktok = suggestPostingTimes("tiktok", now, 1)[0]?.value ?? "";
  const facebook = suggestPostingTimes("facebook", now, 1)[0]?.value ?? "";
  check("platforms differ", tiktok !== facebook, `${tiktok} vs ${facebook}`);
  check("tiktok uses its first window", tiktok.endsWith("T11:00"), tiktok);
  check("facebook uses its first window", facebook.endsWith("T09:00"), facebook);
}

// An unknown platform must still produce something usable.
{
  const times = suggestPostingTimes("mastodon", new Date("2026-03-10T00:01:00"), 2);
  check("unknown platform falls back", times.length === 2);
}

check(
  "every publishing platform has a window",
  ["tiktok", "instagram", "facebook", "youtube"].every(
    (p) => (PLATFORM_WINDOWS[p]?.length ?? 0) > 0,
  ),
);

// datetime-local must be local wall-clock with no timezone suffix, or the
// browser silently rejects the value and the field renders empty.
{
  const value = toLocalInputValue(new Date("2026-03-10T09:05:00"));
  check("formats for datetime-local", value === "2026-03-10T09:05", value);
  check("has no timezone suffix", !value.endsWith("Z"));
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
