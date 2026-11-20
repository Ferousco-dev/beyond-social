"use client";

import { isLong } from "./pacing";
import { StepAssets } from "./step-assets";
import { isTalking, type GenerateFormValues } from "./types";
import { VoicePicker } from "./voice-picker";

/** Who is in the video and, for a long video, which voice reads it. Music is added in the editor, where it can be uploaded. */
export function StepCast({ values, onChange }: { values: GenerateFormValues; onChange: (patch: Partial<GenerateFormValues>) => void }) {
  const narrated = !isTalking(values) && values.speakerMode !== "conversation" && isLong(values.seconds);
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="cast-people" className="flex flex-col gap-3">
        <h3 id="cast-people" className="text-base font-semibold text-ink">
          Who and what you see
        </h3>
        <StepAssets values={values} onChange={onChange} />
      </section>
      {narrated ? <VoicePicker value={values.voice} onChange={(voice) => onChange({ voice })} /> : null}
    </div>
  );
}
