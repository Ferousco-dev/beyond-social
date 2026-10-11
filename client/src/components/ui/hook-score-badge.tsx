"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import { scoreHook } from "@/lib/hooks/score";
import { cn } from "@/lib/utils";

/**
 * A floor on the hook, not a verdict. This is a rule-based check, no model
 * call, so it catches the hook that says nothing, "this is a video about our
 * product", and stays quiet above that: two decent hooks score close together
 * and the gap between them is judgement this cannot make.
 */
export function HookScoreBadge({ text }: { text: string }) {
  const result = useMemo(() => scoreHook(text), [text]);

  const tone =
    result.score >= 50
      ? "bg-primary/10 text-primary"
      : result.score >= 20
        ? "bg-cloud text-ink-soft"
        : "bg-warning/10 text-warning";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
          tone,
        )}
      >
        Hook score {result.score}
      </span>
      {result.flags.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {result.flags[0]}
        </span>
      ) : null}
    </div>
  );
}
