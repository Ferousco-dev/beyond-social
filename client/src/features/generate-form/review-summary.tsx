import { audienceLabel } from "./audience";
import { videoKind } from "./start-generation";
import { isTalking, purposeLabel, type GenerateFormValues } from "./types";

/** What will be generated, and what it costs. */
export function ReviewSummary({
  values,
  avatarScript,
  credits,
  balance,
}: {
  values: GenerateFormValues;
  avatarScript: string;
  credits: number | null;
  balance: number | null;
}) {
  const rows: ReadonlyArray<[string, string]> = [
    ["Objective", values.objective || "—"],
    [
      "Purpose & audience",
      [purposeLabel(values), audienceLabel(values.audience)]
        .filter(Boolean)
        .join(" · ") || "—",
    ],
    [
      "Format",
      videoKind(values) === "conversation"
        ? `${values.platform} · ${values.aspectRatio} · ${values.turns.length} turns, each as long as its recording`
        : isTalking(values)
          ? `${values.platform} · ${values.aspectRatio} · as long as your voice recording`
          : `${values.platform} · ${values.aspectRatio} · ${values.seconds}s`,
    ],
    [
      "Generator",
      videoKind(values) === "conversation"
        ? `KIE lip-sync, one clip per turn`
        : isTalking(values)
          ? "KIE lip-sync to your recording"
          : "KIE Kling 3.0 video",
    ],
    [
      "Script",
      videoKind(values) === "conversation"
        ? values.turns
            .map((turn) => turn.words.trim())
            .filter(Boolean)
            .join(" / ") || "Add each turn's words"
        : isTalking(values)
          ? avatarScript || "Add the words your recording says"
          : values.hook !== ""
            ? values.hook
            : values.scenes.slice(0, 80),
    ],
    ["Speech", `${values.language} · ${values.tone}`],
    [
      "Assets",
      videoKind(values) === "conversation"
        ? `${new Set(values.turns.map((turn) => turn.faceAssetId)).size} people from your library`
        : isTalking(values)
          ? "Face and voice from your library"
          : values.firstFrameId !== ""
            ? "Starting picture from your library"
            : "None",
    ],
  ];

  return (
    <dl className="flex flex-col gap-2 rounded-2xl border border-hairline bg-paper p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-sm">
          <dt className="w-20 shrink-0 font-medium text-ink-soft">{label}</dt>
          <dd className="min-w-0 flex-1 truncate text-ink">
            {value !== "" ? value : "—"}
          </dd>
        </div>
      ))}
      <div className="flex gap-3 border-t border-hairline pt-2 text-sm">
        <dt className="w-20 shrink-0 font-medium text-ink-soft">Cost</dt>
        <dd className="min-w-0 flex-1 text-ink">
          {credits === null ? (
            isTalking(values) && avatarScript === "" ? (
              "Add the recording's words to estimate"
            ) : (
              "Estimating…"
            )
          ) : (
            <>
              <span className="font-semibold tabular-nums">
                {credits} credits
              </span>
              {balance !== null ? (
                <span className="text-ink-soft"> · {balance} available</span>
              ) : null}
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
