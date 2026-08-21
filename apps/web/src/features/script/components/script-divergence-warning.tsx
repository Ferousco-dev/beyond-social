import { AlertTriangle } from "lucide-react";

import { type DivergenceWarning } from "@/lib/script/divergence";

/**
 * The one thing worth reconsidering before rendering, when the live edit has
 * drifted from the pattern the script was written with. Styled as a warning
 * rather than the neutral `bg-cloud` banner elsewhere on this sheet, because
 * unlike a stale subject this isn't something the sheet can fix with a
 * button; it's a judgement call the user has to make themselves.
 */
export function ScriptDivergenceWarning({ warning }: { warning: DivergenceWarning }) {
  return (
    <div
      role="status"
      className="mt-2.5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs text-warning"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p>{warning.message}</p>
        <p className="font-medium">{warning.recommendation}</p>
      </div>
    </div>
  );
}
