"use client";

import { useState } from "react";
import { type Route } from "next";
import { useRouter } from "next/navigation";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { LengthPicker } from "@/features/generate-form/length-picker";
import { CTA_OPTIONS } from "@/features/generate-form/options";
import { recommendedLength, spokenText, type Length } from "@/features/generate-form/pacing";

import type { AnalysisContent } from "../actions";
import type { ApprovedScript } from "../approved-script";
import { BackButton } from "./back-button";

const ATTRIBUTES: ReadonlyArray<{ label: string; key: "mood" | "style" | "pacing" }> = [
  { label: "Mood", key: "mood" },
  { label: "Style", key: "style" },
  { label: "Pacing", key: "pacing" },
];

/** The analysis summary and the fresh script drafted from it, ready to approve. */
export function ScriptEditor({
  analysis,
  context,
  approved,
  onApprove,
  onBack,
}: {
  analysis: AnalysisContent;
  context: string;
  approved: boolean;
  onApprove: (script: ApprovedScript) => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [hook, setHook] = useState(analysis.hook);
  const [main, setMain] = useState(() =>
    analysis.scenes.length > 0
      ? analysis.scenes.map((scene, index) => `Scene ${index + 1}: ${scene.visual}`).join("\n\n")
      : "",
  );
  const [dialogue, setDialogue] = useState(analysis.voiceover);
  const [cta, setCta] = useState<string>(CTA_OPTIONS[0]?.value ?? "");
  const spoken = spokenText({ dialogue, cta });
  const [seconds, setSeconds] = useState<Length>(() => recommendedLength(spoken, ""));
  const script: ApprovedScript = {
    hook,
    main,
    dialogue,
    cta,
    seconds,
    speakers: analysis.speakers,
    audience: analysis.audience ?? undefined,
    style: analysis.style || undefined,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-hairline bg-paper p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">Reference analysis · {context}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{analysis.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-cloud/60 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Scenes</dt>
            <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-ink">{analysis.scenes.length}</dd>
          </div>
          {ATTRIBUTES.map(({ label, key }) => (
            <div key={key} className="rounded-xl bg-cloud/60 px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="mt-0.5 truncate text-sm text-ink">{analysis[key] !== "" ? analysis[key] : "—"}</dd>
            </div>
          ))}
        </dl>
        {analysis.speakers > 1 ? (
          <p className="mt-3 rounded-xl bg-cloud/60 px-3 py-2 text-xs leading-relaxed text-ink">
            {analysis.speakers} people talk in this video. In video setup you can make yours a conversation: each person gets
            their own saved face and voice, and their turns play one after another.
          </p>
        ) : null}
        {analysis.whyItWorks !== "" ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">Why it works: {analysis.whyItWorks}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">Suggested script, inspired by the reference, written fresh</h3>
        {(
          [
            { label: "Opening hook", value: hook, onChange: setHook, rows: 2 },
            {
              label: `Scene-by-scene script (${analysis.scenes.length} ${analysis.scenes.length === 1 ? "scene" : "scenes"})`,
              value: main,
              onChange: setMain,
              rows: 5,
            },
            { label: "Dialogue or narration", value: dialogue, onChange: setDialogue, rows: 4 },
          ] as const
        ).map((field) => (
          <label key={field.label} className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            {field.label}
            <textarea
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              rows={field.rows}
              className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm font-normal leading-relaxed text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary"
            />
          </label>
        ))}
        <ChoiceChips
          label="Call to action"
          options={CTA_OPTIONS}
          value={cta}
          onChange={setCta}
          customPlaceholder="Write your own call to action"
        />
        <LengthPicker value={seconds} onChange={setSeconds} spoken={spoken} contentKind="" />
      </div>

      {approved ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="rounded-xl border border-hairline bg-paper p-3 text-sm text-ink">
            Script approved. You can still edit it here; video setup uses the latest version, not the source clip.
          </p>
          <button
            type="button"
            onClick={() => {
              onApprove(script);
              window.sessionStorage.removeItem("bs:generate-draft");
              window.sessionStorage.removeItem("bs:own-idea");
              router.push("/dashboard/videos/new" as Route);
            }}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue to video setup
          </button>
          <BackButton onBack={onBack} />
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(script)}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Approve script
          </button>
          <BackButton onBack={onBack} />
        </div>
      )}
    </div>
  );
}
