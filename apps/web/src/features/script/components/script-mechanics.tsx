import { ImpactBadge } from "@/components/ui/impact-badge";
import { HOOK_IMPACT, paceImpact, sceneChangeImpact, type ImpactLevel } from "@/lib/script/impact";
import { totalSeconds, type ScriptMechanics, type ScriptScene } from "@/lib/script/schema";

/**
 * Why the source video worked, shown and not offered for editing.
 *
 * This is the part being borrowed. Everything else on the sheet is the user's
 * to change; editing this would be editing the one thing they came for, so it
 * reads as reference rather than as fields.
 *
 * Three of the four rows carry an impact badge: how much that characteristic
 * is estimated to matter for retention, not production quality. Hook and
 * pacing are read straight off the analysis and this script's own numbers
 * (see `lib/script/impact.ts` for how); the arc is shown without one because
 * nothing here computes it. Call to action gets its badge over on the subject
 * fields instead, next to the field it actually describes.
 */
export function ScriptMechanicsPanel({
  mechanics,
  scenes,
}: {
  mechanics: ScriptMechanics;
  scenes: readonly ScriptScene[];
}) {
  const rows: readonly { label: string; value: string; impact: ImpactLevel | null }[] = [
    { label: "Hook", value: mechanics.hookType, impact: HOOK_IMPACT },
    { label: "Pacing", value: mechanics.pacing, impact: paceImpact(mechanics) },
    {
      label: "Scene changes",
      value: `${scenes.length} scene${scenes.length === 1 ? "" : "s"}, ${totalSeconds(scenes)}s total`,
      impact: sceneChangeImpact(scenes),
    },
    { label: "Arc", value: mechanics.emotionalArc, impact: null },
  ];

  return (
    <section className="rounded-xl bg-cloud p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          What keeps this working
        </h3>
        {/* Nothing below has an input next to it; this is why. */}
        <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
          Preserved
        </span>
      </div>

      <dl className="mt-2.5 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-soft">
              {row.label}
              {row.impact ? <ImpactBadge level={row.impact} /> : null}
            </dt>
            <dd className="mt-0.5 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      {mechanics.retention.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {mechanics.retention.map((technique) => (
            <li key={technique} className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink-soft">
              {technique}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
