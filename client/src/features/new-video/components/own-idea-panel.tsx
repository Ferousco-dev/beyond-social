"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useState } from "react";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary";

export interface OwnIdea {
  objective: string;
  audience: string;
  product: string;
  style: string;
}

export const OWN_IDEA_KEY = "bs:own-idea";

/** Option 3: describe the idea in four fields. The main page reads it in M5. */
export function OwnIdeaPanel() {
  const router = useRouter();
  const [fields, setFields] = useState<OwnIdea>({ objective: "", audience: "", product: "", style: "" });

  function set(key: keyof OwnIdea, value: string): void {
    setFields((current) => ({ ...current, [key]: value }));
  }

  const ready =
    fields.objective.trim() !== "" &&
    fields.audience.trim() !== "" &&
    fields.product.trim() !== "" &&
    fields.style.trim() !== "";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        window.sessionStorage.setItem(OWN_IDEA_KEY, JSON.stringify(fields));
        router.push("/dashboard/videos/new" as Route);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Objective
        <input value={fields.objective} onChange={(event) => set("objective", event.target.value)} placeholder="Promote my new serum" aria-label="Objective" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Target audience
        <input value={fields.audience} onChange={(event) => set("audience", event.target.value)} placeholder="Women 25–34" aria-label="Target audience" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Product or service
        <input value={fields.product} onChange={(event) => set("product", event.target.value)} placeholder="Glow serum" aria-label="Product or service" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Preferred style
        <input value={fields.style} onChange={(event) => set("style", event.target.value)} placeholder="Bright, fast-cut UGC" aria-label="Preferred style" className={fieldClass} />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={!ready}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
