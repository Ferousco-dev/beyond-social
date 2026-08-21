import { type ImpactLevel } from "@/lib/script/impact";
import { cn } from "@/lib/utils";

/** Same tone scale as `HookScoreBadge`: primary for what matters most, cloud
 * for the middle, and quiet paper for what matters least, so a badge that
 * ranks a characteristic reads consistently with the one that scores it. */
const TONE: Record<ImpactLevel, string> = {
  High: "bg-primary/10 text-primary",
  Medium: "bg-cloud text-ink-soft",
  Low: "border border-hairline text-ink-soft/70",
};

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
        TONE[level],
      )}
    >
      {level} impact
    </span>
  );
}
