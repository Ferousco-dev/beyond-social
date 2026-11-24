"use client";

import { StepAssets } from "./step-assets";
import type { GenerateFormValues } from "./types";

/** Who is in the video. Music is added in the editor, where it can be uploaded. */
export function StepCast({ values, onChange }: { values: GenerateFormValues; onChange: (patch: Partial<GenerateFormValues>) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Who and what you see" className="flex flex-col gap-3">
        <StepAssets values={values} onChange={onChange} />
      </section>
    </div>
  );
}
