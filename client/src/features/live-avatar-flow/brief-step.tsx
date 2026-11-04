"use client";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary";

export interface AvatarBrief {
  objective: string;
  audience: string;
  product: string;
  style: string;
}

/** Step 6: what the video is for, in four fields. */
export function BriefStep({
  brief,
  onChange,
}: {
  brief: AvatarBrief;
  onChange: (brief: AvatarBrief) => void;
}) {
  function set(key: keyof AvatarBrief, value: string): void {
    onChange({ ...brief, [key]: value });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Objective
        <input value={brief.objective} onChange={(event) => set("objective", event.target.value)} placeholder="Introduce me to new followers" aria-label="Objective" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Target audience
        <input value={brief.audience} onChange={(event) => set("audience", event.target.value)} placeholder="Women 25–34" aria-label="Target audience" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Product or service
        <input value={brief.product} onChange={(event) => set("product", event.target.value)} placeholder="Glow serum" aria-label="Product or service" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Style
        <input value={brief.style} onChange={(event) => set("style", event.target.value)} placeholder="Warm, direct to camera" aria-label="Style" className={fieldClass} />
      </label>
    </div>
  );
}
