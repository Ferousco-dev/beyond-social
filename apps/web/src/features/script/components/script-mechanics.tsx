import { type ScriptMechanics } from "@/lib/script/schema";

/**
 * Why the source video worked, shown and not offered for editing.
 *
 * This is the part being borrowed. Everything else on the sheet is the user's
 * to change; editing this would be editing the one thing they came for, so it
 * reads as reference rather than as fields.
 */
export function ScriptMechanicsPanel({ mechanics }: { mechanics: ScriptMechanics }) {
  const rows: readonly { label: string; value: string }[] = [
    { label: "Hook", value: mechanics.hookType },
    { label: "Pacing", value: mechanics.pacing },
    { label: "Arc", value: mechanics.emotionalArc },
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

      <dl className="mt-2.5 grid gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] uppercase tracking-wide text-ink-soft">{row.label}</dt>
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
